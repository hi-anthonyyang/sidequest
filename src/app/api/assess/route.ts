import { NextResponse } from 'next/server';
import { recordAssess } from '@/lib/metrics';
import OpenAI from 'openai';
import { AssessmentResponse, UniversityId } from '@/lib/types';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getUniversityData, getSystemPrompt } from '@/lib/university';

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
    let recommendations: unknown;
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
      } catch (err) {
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

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error processing assessment:', error);
    // We cannot reliably get duration here without stored start; record as error only
    try { recordAssess(0, false); } catch {}
    const errMsg = (error as Error)?.message || 'Failed to process assessment';
    return NextResponse.json({ error: 'Failed to process assessment', message: errMsg }, { status: 500 });
  }
} 