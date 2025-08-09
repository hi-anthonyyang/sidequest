import { NextResponse } from 'next/server';
import { recordAssess } from '@/lib/metrics';
import OpenAI from 'openai';
import { AssessmentResponse, UniversityId } from '@/lib/types';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getUniversityData, getSystemPrompt } from '@/lib/university';
import type { AssessmentResults, UniversityData } from '@/lib/types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { answers, universityId = 'fresno_state' } = await request.json();

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

    // Log the messages sent to OpenAI
    console.log('OpenAI messages:', JSON.stringify(messages, null, 2));

    // Call OpenAI API with default model and fallback
    const defaultModel = process.env.OPENAI_ASSESS_MODEL || 'gpt-4o-mini';
    const fallbackModel = process.env.OPENAI_ASSESS_FALLBACK_MODEL || 'gpt-4o';

    const start = Date.now();
    let completion;
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

    const response = completion.choices[0]?.message?.content;

    // Log the raw response from OpenAI
    console.log('OpenAI raw response:', response);

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response with a forgiving fallback
    let recommendations: AssessmentResults;
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
    recordAssess(Date.now() - start, true);

    // Post-process: ensure minimum counts with personalized top-ups
    const normalized = enrichWithTopUps(answers, universityData, recommendations);
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