import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AssessmentResponse, UniversityId } from '@/lib/types';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getUniversityData, getSystemPrompt } from '@/lib/university';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

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

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content;

    // Log the raw response from OpenAI
    console.log('OpenAI raw response:', response);

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const recommendations = JSON.parse(response);

    // Count the number of individual majors generated
    let majorsCount = 0;
    if (Array.isArray(recommendations.majors)) {
      majorsCount = recommendations.majors.length;
    } else if (Array.isArray(recommendations)) {
      majorsCount = recommendations.length;
    }

    // After getting the GPT response:
    const submission = {
      timestamp: new Date().toISOString(),
      sessionId: randomUUID(),
      answers,
      gptResponse: recommendations
    };

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error processing assessment:', error);
    return NextResponse.json(
      { error: 'Failed to process assessment' },
      { status: 500 }
    );
  }
} 