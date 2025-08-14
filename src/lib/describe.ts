import OpenAI from 'openai';
import { AssessmentResults, UniversityData } from '@/lib/types';

type DescribeRequestItem = { type: 'major' | 'organization' | 'event'; name: string; context?: string };

export async function fillMissingDescriptions(
  openai: OpenAI,
  uni: UniversityData,
  results: AssessmentResults
): Promise<AssessmentResults> {
  const items: DescribeRequestItem[] = [];

  for (const m of results.majors) {
    if (!m.description || m.description.trim() === '') {
      items.push({ type: 'major', name: m.name, context: m.department || '' });
    }
  }
  for (const o of results.organizations) {
    if (!o.description || o.description.trim() === '') {
      items.push({ type: 'organization', name: o.name, context: o.category || '' });
    }
  }
  for (const e of results.events) {
    if (!e.description || e.description.trim() === '') {
      const parts = [e.category, e.location].filter(Boolean).join(' · ');
      items.push({ type: 'event', name: e.name, context: parts });
    }
  }

  if (items.length === 0) return results;

  const list = items.map(i => `- ${i.type}: ${i.name}${i.context ? ` (${i.context})` : ''}`).join('\n');
  const system = `You are writing brief, neutral one-sentence descriptions for official items at ${uni.university.name}.
Do not invent specific program requirements, dates, or websites. Keep it generic and student-friendly.
Length limits:
- Major: <= 250 characters
- Organization: <= 140 characters
- Event: <= 140 characters
Return STRICT JSON mapping each item to a description:
{
  "items": [
    { "name": "<exact name>", "description": "one sentence" }
  ]
}`;

  const user = `Provide descriptions for these items (use only general domain knowledge; no specific claims beyond the name/type/context):\n${list}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_ASSESS_MODEL || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 400,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  let parsed: { items?: { name: string; description: string }[] } | null = null;
  const content = completion.choices?.[0]?.message?.content || '{}';
  try {
    parsed = JSON.parse(content);
  } catch {
    const cleaned = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    try { parsed = JSON.parse(cleaned); } catch { parsed = null; }
  }

  const map = new Map<string, string>();
  for (const it of parsed?.items || []) {
    const d = String(it.description || '').trim();
    if (it.name && d) map.set(it.name, d);
  }

  // Apply backfills
  results.majors = results.majors.map(m => (
    !m.description || m.description.trim() === ''
      ? { ...m, description: map.get(m.name) || m.description || '' }
      : m
  ));
  results.organizations = results.organizations.map(o => (
    !o.description || o.description.trim() === ''
      ? { ...o, description: map.get(o.name) || o.description || '' }
      : o
  ));
  results.events = results.events.map(e => (
    !e.description || e.description.trim() === ''
      ? { ...e, description: map.get(e.name) || e.description || '' }
      : e
  ));

  return results;
}


