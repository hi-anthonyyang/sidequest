import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { recordAssess } from '@/lib/metrics';
import type { AssessmentResults, AssessmentResponse, UniversityData, UniversityId } from '@/lib/types';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getUniversityData, getSystemPrompt } from '@/lib/university';
import { saveAssessmentRecord } from '@/lib/assessStore';
import { saveAssessmentMetric, refreshDailyRollupFor } from '@/lib/metricsStore';
import { runSelector, materializeSelection } from '@/lib/selector';
import { fillMissingDescriptions } from '@/lib/describe';
import { enrichCareersWithRealData } from '@/lib/careerEnrichment';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { answers, universityId = 'fresno_state', email, studentId } = await request.json();
    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    // Load university dataset
    const uniId = universityId as UniversityId;
    const uniData = await getUniversityData(uniId);
    const systemPrompt = getSystemPrompt(uniId, uniData);

    // Compose messages
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...answers.map((a: AssessmentResponse) => ({
        role: 'user' as const,
        content: `Question ${a.questionId}: ${a.answer}`,
      })),
    ];

    // Low-signal detection
    const allText = answers.map((a: AssessmentResponse) => (a?.answer || '').trim()).join(' ').toLowerCase();
    const uniqueTokens = new Set(allText.split(/[^a-z0-9]+/).filter(Boolean));
    const isLowSignal = allText.length < 40 || uniqueTokens.size < 8 || /(.)\1{3,}/.test(allText);

    const defaultModel = process.env.OPENAI_ASSESS_MODEL || 'gpt-4o-mini';
    const fallbackModel = process.env.OPENAI_ASSESS_FALLBACK_MODEL || 'gpt-4o';

    const start = Date.now();
    let completion: Awaited<ReturnType<typeof openai.chat.completions.create>> | null = null;

    if (!isLowSignal) {
      try {
        completion = await openai.chat.completions.create({
          model: defaultModel,
          messages,
          temperature: 0.7,
          max_tokens: 1200,
          response_format: { type: 'json_object' },
        });
      } catch {
        // Backoff and try fallback model
        await new Promise((r) => setTimeout(r, 600));
        completion = await openai.chat.completions.create({
          model: fallbackModel,
          messages,
          temperature: 0.7,
          max_tokens: 1200,
          response_format: { type: 'json_object' },
        });
      }
    }

    const response = completion?.choices?.[0]?.message?.content ?? null;
    if (!response && !isLowSignal) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON best-effort
    let rec: AssessmentResults | null = null;
    if (response) {
      try {
        rec = JSON.parse(response);
      } catch {
        const cleaned = response.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
        const s = cleaned.indexOf('{');
        const e = cleaned.lastIndexOf('}');
        if (s !== -1 && e !== -1 && e > s) {
          rec = JSON.parse(cleaned.slice(s, e + 1));
        }
      }
    }

    const latency = Date.now() - start;
    recordAssess(latency, true);

    let normalized: AssessmentResults;
    if (isLowSignal) {
      // Small selector path: choose names only, then materialize + top-up
      const selection = await runSelector(openai, answers, uniData);
      const materialized = materializeSelection(selection, uniData);
      normalized = enrichWithTopUps(answers, uniData, materialized);
      // Backfill missing descriptions with a tiny model pass
      try {
        normalized = await fillMissingDescriptions(openai, uniData, normalized);
      } catch {}
    } else {
      normalized = enrichWithTopUps(answers, uniData, (rec as AssessmentResults) || { majors: [], careers: [], organizations: [], events: [] });
    }

    // Enrich careers with real salary, growth, and education data
    try {
      normalized.careers = await enrichCareersWithRealData(normalized.careers);
    } catch {
      // Continue with original career data if enrichment fails
    }

    // Persist (best-effort)
    try {
      const secret = (process.env.APP_HASH_SECRET || '').trim();
      const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
      let emailHash: string | null = null;
      let studentIdHash: string | null = null;
      let emailDomain: string | null = null;
      if (secret && (email || studentId) && typeof crypto !== 'undefined') {
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        if (email) {
          const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(email).toLowerCase()));
          emailHash = toHex(sig);
          const at = String(email).indexOf('@');
          emailDomain = at > -1 ? String(email).slice(at + 1).toLowerCase() : null;
        }
        if (studentId) {
          const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(studentId)));
          studentIdHash = toHex(sig);
        }
      }

      await saveAssessmentRecord({
        universityId,
        answersJson: answers,
        resultJson: normalized,
        model: completion?.model || defaultModel,
        promptTokens: completion?.usage?.prompt_tokens ?? null,
        completionTokens: completion?.usage?.completion_tokens ?? null,
        latencyMs: latency,
        success: true,
        emailHash,
        studentIdHash,
        emailDomain,
      });

      // Store persistent lightweight metrics row
      try {
        const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || process.env.SOURCE_VERSION || null;
        await saveAssessmentMetric({
          universityId: String(universityId),
          latencyMs: latency,
          success: true,
          model: completion?.model || defaultModel,
          promptTokens: completion?.usage?.prompt_tokens ?? null,
          completionTokens: completion?.usage?.completion_tokens ?? null,
          commitSha,
        });
        // Update daily rollup for today (idempotent upsert)
        await refreshDailyRollupFor(new Date());
      } catch {
        // ignore metric failures
      }
    } catch {
      // swallow
    }

    return NextResponse.json(normalized);
  } catch {
    try { recordAssess(0, false); } catch {}
    return NextResponse.json({ error: 'Failed to process assessment' }, { status: 500 });
  }
}

// ---------------- Helpers ----------------
function enrichWithTopUps(
  answers: { questionId: number; answer: string }[],
  uni: UniversityData,
  rec: AssessmentResults
): AssessmentResults {
  const userText = answers.map((a) => a.answer).join(' ').toLowerCase();
  const score = (text: string): number => {
    const words = userText.split(/[^a-z0-9]+/).filter(Boolean);
    const t = (text || '').toLowerCase();
    let s = 0; for (const w of words) { if (w.length >= 3 && t.includes(w)) s += 1; }
    return s;
  };

  const majors = Array.isArray(rec.majors) ? [...rec.majors] : [];
  const majorScores = new Map<string, number>();
  if (majors.length < 5) {
    const existing = new Set(majors.map((m) => m.name));
    const candidates = uni.majors
      .filter((m) => !existing.has(m.name))
      .map((m) => { const s = score(`${m.name} ${m.description} ${m.department}`); majorScores.set(m.name, s); return { m, s }; })
      .sort((a, b) => b.s - a.s);
    for (const c of candidates) { majors.push(c.m); if (majors.length >= 5) break; }
  } else {
    for (const m of majors) { majorScores.set(m.name, score(`${m.name} ${m.description} ${m.department}`)); }
  }

  const careers = Array.isArray(rec.careers) ? [...rec.careers] : [];
  
  // If LLM provided fewer than 5 careers, add fallback careers with proper job titles
  if (careers.length < 5) {
    const existingTitles = new Set(careers.map((c) => c.title));
    
    // Map majors to realistic career titles (not degree-based)
    const majorToCareerMap: Record<string, string[]> = {
      'Psychology': ['Clinical Psychologist', 'School Counselor', 'Human Resources Specialist'],
      'Business': ['Marketing Manager', 'Financial Analyst', 'Operations Manager'],
      'Communication': ['Public Relations Specialist', 'Social Media Manager', 'Content Writer'],
      'Art': ['Graphic Designer', 'Art Therapist', 'Museum Curator'],
      'Computer Science': ['Software Engineer', 'Data Analyst', 'UX Designer'],
      'Biology': ['Research Scientist', 'Healthcare Administrator', 'Environmental Consultant'],
      'Education': ['Elementary Teacher', 'Curriculum Developer', 'Education Administrator'],
      'History': ['Historian', 'Archivist', 'Museum Director'],
      'Sociology': ['Social Worker', 'Community Organizer', 'Policy Analyst'],
      'Economics': ['Economic Analyst', 'Financial Advisor', 'Market Research Analyst']
    };
    
    // Generate careers based on recommended majors
    const fallbackCareers: Array<{ title: string; description: string; relatedMajors: string[] }> = [];
    for (const major of majors.slice(0, 3)) { // Use top 3 majors
      const majorField = major.name.split(',')[0].trim(); // Extract field from "Psychology, B.A."
      const careerOptions = majorToCareerMap[majorField] || [`${majorField} Specialist`];
      
      for (const careerTitle of careerOptions) {
        if (!existingTitles.has(careerTitle) && fallbackCareers.length < (5 - careers.length)) {
          fallbackCareers.push({
            title: careerTitle,
            description: `Professional opportunities in ${majorField.toLowerCase()} that utilize skills and knowledge from the ${major.name} program.`,
            relatedMajors: [major.name]
          });
          existingTitles.add(careerTitle);
        }
      }
    }
    
    // Add fallback careers to the list
    for (const fallback of fallbackCareers) {
      careers.push(fallback as AssessmentResults['careers'][number]);
    }
  }

  const organizations = Array.isArray(rec.organizations) ? [...rec.organizations] : [];
  if (organizations.length < 3) {
    const existing = new Set(organizations.map((o) => o.name));
    const candidates = uni.organizations
      .filter((o) => !existing.has(o.name))
      .map((o) => ({ o, s: score(`${o.name} ${o.description} ${o.category}`) }))
      .sort((a, b) => b.s - a.s);
    for (const c of candidates) { organizations.push(c.o); if (organizations.length >= 3) break; }
  }

  const events = Array.isArray(rec.events) ? [...rec.events] : [];
  if (events.length < 3) {
    const existing = new Set(events.map((e) => e.name));
    const candidates = uni.events
      .filter((e) => !existing.has(e.name))
      .map((e) => ({ e, s: score(`${e.name} ${e.description} ${e.category}`) }))
      .sort((a, b) => b.s - a.s);
    for (const c of candidates) { events.push(c.e); if (events.length >= 3) break; }
  }

  return { archetype: rec.archetype, majors, careers, organizations, events };
}

// Note: generic balancedFallback removed in favor of selector path for low-signal