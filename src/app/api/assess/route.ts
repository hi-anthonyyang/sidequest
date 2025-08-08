import { NextResponse } from 'next/server';
import { recordAssess } from '@/app/api/admin/metrics/route';
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
        max_tokens: 900,
        response_format: { type: 'json_object' },
      });
    } catch (primaryErr) {
      console.error('[ASSESS] primary model failed:', primaryErr);
      completion = await openai.chat.completions.create({
        model: fallbackModel,
        messages,
        temperature: 0.7,
        max_tokens: 900,
        response_format: { type: 'json_object' },
      });
    }

    const response = completion.choices[0]?.message?.content;

    // Log the raw response from OpenAI
    console.log('OpenAI raw response:', response);

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const recommendations = JSON.parse(response);
    recordAssess(Date.now() - start, true);

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error processing assessment:', error);
    // record failure with duration if start exists
    try { (global as any).start && recordAssess(Date.now() - (global as any).start, false); } catch {}
    return NextResponse.json(
      { error: 'Failed to process assessment' },
      { status: 500 }
    );
  }
} 