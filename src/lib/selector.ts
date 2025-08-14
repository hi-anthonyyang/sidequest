import OpenAI from 'openai';
import { AssessmentResponse, UniversityData, AssessmentResults } from '@/lib/types';

export interface SelectorResult {
  archetype?: string;
  tags?: string[];
  majors: { name: string; score?: number }[];
  organizations: { name: string; score?: number }[];
  events: { name: string; score?: number }[];
}

function buildSelectorPrompt(answers: AssessmentResponse[], uni: UniversityData): string {
  const inputText = answers.map(a => String(a.answer || '').trim()).filter(Boolean).join(' ');
  const majorsList = uni.majors.map(m => `- ${m.name}`).join('\n');
  const orgsList = uni.organizations.map(o => `- ${o.name}`).join('\n');
  const eventsList = uni.events.map(e => `- ${e.name}`).join('\n');

  return `You are an academic advisor for ${uni.university.name}. Your task is to SELECT items from official lists, not to write descriptions.

ONLY choose from these lists:
Majors:\n${majorsList}\n\nOrganizations:\n${orgsList}\n\nEvents:\n${eventsList}

Student inputs (may be very short; expand with synonyms and related concepts, but still select from the lists): "${inputText}"

Return STRICT JSON (no markdown, no comments) with this shape:
{
  "archetype": "short title like 'You Are: The Empath 💙' (optional)",
  "tags": ["keywords"],
  "majors": [{"name": "<major name>", "score": 0.0}],
  "organizations": [{"name": "<org name>", "score": 0.0}],
  "events": [{"name": "<event name>", "score": 0.0}]
}

Rules:
- Use only names from the lists above.
- Include 5 majors where possible; 3 organizations; 3 events.
- Scores are optional confidence values 0..1; omit if unsure.
`;
}

export async function runSelector(openai: OpenAI, answers: AssessmentResponse[], uni: UniversityData): Promise<SelectorResult> {
  const prompt = buildSelectorPrompt(answers, uni);
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_ASSESS_MODEL || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 300,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: 'Select the best matching items and return the JSON.' },
    ],
  });

  const content = completion.choices?.[0]?.message?.content || '{}';
  let parsed: SelectorResult | null = null;
  try {
    parsed = JSON.parse(content) as SelectorResult;
  } catch {
    // Try to clean code fences if present
    const cleaned = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    try { parsed = JSON.parse(cleaned) as SelectorResult; } catch { parsed = null; }
  }

  return parsed ?? { majors: [], organizations: [], events: [] };
}

export function materializeSelection(selection: SelectorResult, uni: UniversityData): AssessmentResults {
  const findMajor = (name: string) => uni.majors.find(m => m.name === name);
  const findOrg = (name: string) => uni.organizations.find(o => o.name === name);
  const findEvent = (name: string) => uni.events.find(e => e.name === name);

  const majors = (selection.majors || [])
    .map(s => findMajor(s.name))
    .filter(Boolean) as AssessmentResults['majors'];

  const organizations = (selection.organizations || [])
    .map(s => findOrg(s.name))
    .filter(Boolean) as AssessmentResults['organizations'];

  const events = (selection.events || [])
    .map(s => findEvent(s.name))
    .filter(Boolean) as AssessmentResults['events'];

  return {
    archetype: selection.archetype,
    majors,
    careers: [],
    organizations,
    events,
  };
}


