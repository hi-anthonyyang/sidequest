import { NextResponse } from 'next/server';
import { recordAssess } from '@/lib/metrics';
import OpenAI from 'openai';
import { AssessmentResponse, UniversityId } from '@/lib/types';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getUniversityData, getSystemPrompt } from '@/lib/university';
import type { AssessmentResults, UniversityData } from '@/lib/types';
import { saveAssessmentRecord } from '@/lib/assessStore';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { answers, universityId = 'fresno_state', email, studentId } = await request.json();

    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }
   
// Load university data
    const universityData = await getUniversityData(universityId as UniversityId);
    const systemPrompt = getSystemPrompt(universityId as UniversityId, universityData);

    // Format the conversation for the API
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...answers.map((answer: AssessmentResponse) => ({
        role: 'user' as const,
        content: `Question ${answer.questionId}: ${answer.answer}`
      }))
    ];

    // Low-signal detection: if the combined answers are extremely short/repetitive
    const allText = answers.map((a: AssessmentResponse) => (a?.answer || '').trim()).join(' ').toLowerCase();
    const uniqueTokens = new Set(allText.split(/[^a-z0-9]+/).filter(Boolean));
    const avgLen = answers.length ? allText.length / answers.length : 0;
    const isLowSignal = allText.length < 40 || uniqueTokens.size < 8 || /(.)\1{3,}/.test(allText);

    // Call OpenAI API with default model and fallback unless we are in low-signal mode
    const defaultModel = process.env.OPENAI_ASSESS_MODEL || 'gpt-4o-mini';
    const fallbackModel = process.env.OPENAI_ASSESS_FALLBACK_MODEL || 'gpt-4o';

    const start = Date.now();
    let completion;
    if (!isLowSignal) {
      try {
        completion = await openai.chat.completions.create({
          model: defaultModel,
          messages,
          temperature: 0.7,
          max_tokens: 1200,
          response_format: { type: 'json_object' },
        });
      } catch (primaryErr) {
        console.error('[ASSESS] primary model failed:', primaryErr);
        // Gentle backoff for transient 429/5xx
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
  }

    const response = completion?.choices?.[0]?.message?.content;

    // (removed verbose logging of OpenAI raw response)

    if (!response && !isLowSignal) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response with a forgiving fallback
    let recommendations: AssessmentResults | null = null;
    if (response) {
      try {
        recommendations = JSON.parse(response);
      } catch (e) {
      // Try to salvage JSON when the model returns extra text or code fences
      try {
        const cleaned = response
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '');
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          const slice = cleaned.slice(start, end + 1);
          recommendations = JSON.parse(slice);
        } else {
          throw e;
        }
      } catch {
        // Final attempt: ask model to repair to strict JSON only
        console.warn('[ASSESS] JSON parse failed; attempting repair. Raw start:', response?.slice(0, 300));
        const repair = await openai.chat.completions.create({
          model: fallbackModel,
          messages: [
            { role: 'system', content: 'You are a JSON sanitizer. Return strictly valid JSON only, no prose, matching the same structure as provided.' },
            { role: 'user', content: `Fix this into valid strict JSON (do not add fields):\n${response}` },
          ],
          temperature: 0,
          max_tokens: 800,
          response_format: { type: 'json_object' },
        });
        const repaired = repair.choices[0]?.message?.content || '';
        try {
          recommendations = JSON.parse(repaired);
        } catch (finalErr) {
          console.error('[ASSESS] JSON repair failed. Repaired start:', repaired?.slice(0, 300));
          throw finalErr;
        }
      }
    }
    const latency = Date.now() - start;
    recordAssess(latency, true);

    // Post-process: ensure minimum counts with personalized top-ups
    // Low-signal balanced fallback: assemble a diverse set by category
    const normalized = isLowSignal
      ? balancedFallback(universityData)
      : enrichWithTopUps(answers, universityData, recommendations as AssessmentResults);

    // Fire-and-forget persistence; do not block response on DB write
    try {
      // Pseudonymous linkage using HMAC-SHA256
      const secret = (process.env.APP_HASH_SECRET || '').trim();
      const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      let emailHash: string | null = null;
      let studentIdHash: string | null = null;
      let emailDomain: string | null = null;
      if (secret && typeof crypto !== 'undefined' && (email || studentId)) {
        const key = await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
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
        model: completion.model || defaultModel,
        promptTokens: completion.usage?.prompt_tokens ?? null,
        completionTokens: completion.usage?.completion_tokens ?? null,
        latencyMs: latency,
        success: true,
        emailHash: emailHash,
        studentIdHash: studentIdHash,
        emailDomain: emailDomain,
      });
    } catch (persistErr) {
      // Swallow persist errors to keep UX smooth
      console.warn('[ASSESS] persist failed', persistErr);
    }

    return NextResponse.json(normalized);
  } catch (error) {
    console.error('Error processing assessment:', error);
    // We cannot reliably get duration here without stored start; record as error only
    try { recordAssess(0, false); } catch {}
    const errMsg = (error as Error)?.message || 'Failed to process assessment';
    return NextResponse.json({ error: 'Failed to process assessment', message: errMsg }, { status: 500 });
  }
} 

function enrichWithTopUps(
  answers: { questionId: number; answer: string }[],
  uni: UniversityData,
  rec: AssessmentResults
): AssessmentResults {
  const userText = answers.map(a => a.answer).join(' ').toLowerCase();

  // Helper: keyword score
  const score = (text: string) => {
    const words = userText.split(/[^a-z0-9]+/).filter(Boolean);
    const t = (text || '').toLowerCase();
    let s = 0;
    for (const w of words) {
      if (w.length < 3) continue;
      if (t.includes(w)) s += 1;
    }
    return s;
  };

  // Domain boosts: gently bias majors when user mentions domain-specific words
  // Keep this intentionally small and obvious to avoid over-engineering.
  const domainGroups: { keywords: string[]; majors: string[]; boost: number }[] = [
    {
      // furniture / home / built environment → design + architecture related majors
      keywords: [
        'chair',
        'chairs',
        'furniture',
        'sofa',
        'couch',
        'table',
        'wall',
        'room',
        'house',
        'home',
        'interior',
        'decorate',
        'decoration',
        'design',
        'building',
        'architecture',
        'construction'
      ],
      majors: [
        'Interior Design, B.A.',
        'Architectural Studies, B.S.',
        'Construction Management, B.S.',
        'Civil Engineering, B.S.',
        'Integrated Design, B.A.',
        'Industrial Technology, B.S.'
      ],
      boost: 4,
    },
  ];

  const hasAny = (text: string, words: string[]) => {
    const t = text.toLowerCase();
    return words.some((w) => t.includes(w));
  };

  const majorBoost = (majorName: string): number => {
    let b = 0;
    for (const g of domainGroups) {
      if (hasAny(userText, g.keywords) && g.majors.includes(majorName)) {
        b += g.boost;
      }
    }
    return b;
  };

  // Ensure 5 majors
  const majors = Array.isArray(rec.majors) ? [...rec.majors] : [];
  const majorScores = new Map<string, number>();
  if (majors.length < 5) {
    const existing = new Set(majors.map(m => m.name));
    const candidates = uni.majors
      .filter(m => !existing.has(m.name))
      .map(m => {
        const s = score(`${m.name} ${m.description} ${m.department}`) + majorBoost(m.name);
        majorScores.set(m.name, s);
        return { m, s };
      })
      .sort((a, b) => b.s - a.s);
    for (const c of candidates) {
      majors.push(c.m);
      if (majors.length >= 5) break;
    }
  } else {
    // still compute scores for already-selected majors to inform career derivation
    for (const m of majors) {
      const s = score(`${m.name} ${m.description} ${m.department}`) + majorBoost(m.name);
      majorScores.set(m.name, s);
    }
  }

  // Ensure 5 careers (derive simple titles from majors when missing)
  const careers = Array.isArray(rec.careers) ? [...rec.careers] : [];
  if (careers.length < 5) {
    const existingTitles = new Set(careers.map(c => c.title));
    const derived = majors
      .map((m) => {
        const title = `${m.name} Career`;
        return {
          title,
          description: `Pathways related to ${m.name}.`,
          relatedMajors: [m.name],
        };
      })
      .filter(d => !existingTitles.has(d.title))
      .map(d => ({
        d,
        s: (majorScores.get(d.relatedMajors[0]) || 0) + score(d.title),
      }))
      .sort((a, b) => b.s - a.s);
    for (const c of derived) {
      careers.push(c.d as unknown as AssessmentResults["careers"][number]);
      if (careers.length >= 5) break;
    }
  }

  // Optionally top-up orgs/events to minimum 3 with keyword match
  const organizations = Array.isArray(rec.organizations) ? [...rec.organizations] : [];
  if (organizations.length < 3) {
    const existing = new Set(organizations.map(o => o.name));
    const candidates = uni.organizations
      .filter(o => !existing.has(o.name))
      .map(o => ({ o, s: score(`${o.name} ${o.description} ${o.category}`) }))
      .sort((a, b) => b.s - a.s);
    for (const c of candidates) {
      organizations.push(c.o);
      if (organizations.length >= 3) break;
    }
  }

  const events = Array.isArray(rec.events) ? [...rec.events] : [];
  if (events.length < 3) {
    const existing = new Set(events.map(e => e.name));
    const candidates = uni.events
      .filter(e => !existing.has(e.name))
      .map(e => ({ e, s: score(`${e.name} ${e.description} ${e.category}`) }))
      .sort((a, b) => b.s - a.s);
    for (const c of candidates) {
      events.push(c.e);
      if (events.length >= 3) break;
    }
  }

  return {
    archetype: rec.archetype,
    majors,
    careers,
    organizations,
    events,
  };
}

// Balanced fallback for extremely low-signal inputs
function balancedFallback(uni: UniversityData): AssessmentResults {
  const categories: { name: string; match: (m: { name: string; department: string; description: string }) => boolean }[] = [
    { name: 'STEM', match: (m) => /math|engineer|computer|physics|chem|bio|science|technology|data|stat/i.test(`${m.name} ${m.department} ${m.description}`) },
    { name: 'Social Science', match: (m) => /psychology|sociology|political|anthropology|economics|communication|history/i.test(`${m.name} ${m.department} ${m.description}`) },
    { name: 'Business', match: (m) => /business|management|marketing|finance|account/i.test(`${m.name} ${m.department} ${m.description}`) },
    { name: 'Arts & Design', match: (m) => /art|design|music|theatre|theater|graphic|film|media/i.test(`${m.name} ${m.department} ${m.description}`) },
    { name: 'Health', match: (m) => /nurs|health|kines|public health|pre-med|pre med|rehab/i.test(`${m.name} ${m.department} ${m.description}`) },
    { name: 'Education & Public Service', match: (m) => /education|teaching|public|policy|criminal|justice|social work/i.test(`${m.name} ${m.department} ${m.description}`) },
  ];

  // Helper: pick first good match with light randomness among top few
  function pickFrom(matches: typeof uni.majors) {
    const top = matches.slice(0, 6);
    if (top.length === 0) return null;
    const idx = Math.floor(Math.random() * top.length);
    return top[idx];
  }

  const chosenMajors: typeof uni.majors = [];
  for (const cat of categories) {
    const matches = uni.majors.filter(cat.match);
    const picked = pickFrom(matches);
    if (picked) chosenMajors.push(picked);
    if (chosenMajors.length >= 5) break;
  }
  // Fill to 5 if needed
  if (chosenMajors.length < 5) {
    const remaining = uni.majors.filter((m) => !chosenMajors.includes(m));
    while (chosenMajors.length < 5 && remaining.length) {
      chosenMajors.push(remaining.shift()!);
    }
  }

  // Derive simple careers from majors
  const careers = chosenMajors.slice(0, 5).map((m) => ({
    title: `${m.name} Career`,
    description: `Pathways related to ${m.name}.`,
    relatedMajors: [m.name],
  }));

  // Reuse existing orgs/events: pick 3 each with light diversity
  const organizations = uni.organizations.slice(0, 3);
  const events = uni.events.slice(0, 3);

  return {
    archetype: 'You Are: The Explorer 🧭',
    majors: chosenMajors.slice(0, 5),
    careers,
    organizations,
    events,
  };
} 