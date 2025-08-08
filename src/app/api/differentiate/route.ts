import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // Feature flag: disable this endpoint in production until Assignments is launched
    if (process.env.FEATURE_ASSIGNMENTS_ENABLED !== 'true') {
      return NextResponse.json(
        { error: 'Assignments feature is disabled' },
        { status: 403 }
      );
    }

    const { assignment, strategies, numVariations, stayOnTopic } = await req.json();

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment text is required' },
        { status: 400 }
      );
    }

    // Log request body for debugging
    console.log('[DIFFERENTIATE] Request body:', { assignment, strategies, numVariations, stayOnTopic });

    const strategiesList = strategies.join(', ');
    const evenSplitInstruction = (strategies.length === numVariations && strategies.length > 1)
      ? `Assign exactly one strategy to each variation, so each variation uses a different strategy: ${strategiesList}.`
      : `Distribute the strategies (${strategiesList}) as evenly as possible across the ${numVariations} variations, so each variation uses at least one strategy.`;
    const topicInstruction = stayOnTopic
      ? 'IMPORTANT: Do not change the topic, content, or learning objectives of the original assignment. Only modify the format, language, scaffolding, or rigor according to the selected strategy.'
      : '';
    const prompt = `Differentiate the following assignment. ${evenSplitInstruction} ${topicInstruction} Return your response as a JSON object with a 'variations' array. Each item in the array should be an object with two fields: 'text' (the rewritten assignment) and 'title' (a 1-5 word phrase that clearly indicates which strategy was applied, e.g., "Simplified Language Version" or "Higher Rigor Focus"). Example format:\n{\n  \"variations\": [\n    {\n      \"text\": \"First version...\",\n      \"title\": \"Simplified Language Version\"\n    },\n    {\n      \"text\": \"Second version...\",\n      \"title\": \"Scaffolded with Questions\"\n    },\n    {\n      \"text\": \"Third version...\",\n      \"title\": \"Advanced Rigor\"\n    }\n  ]\n}\nAssignment:\n${assignment}`;

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert teacher who specializes in differentiating assignments for diverse learners. Your task is to create modified versions of assignments that maintain the same learning objectives while making them accessible to different types of learners. Always return a properly formatted JSON object with a 'variations' array, where each item has 'text' and 'title' fields. The title should clearly indicate which differentiation strategy was applied."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });
      // Log OpenAI response for debugging
      console.log('[DIFFERENTIATE] OpenAI response:', completion);
    } catch (openaiError) {
      console.error('[DIFFERENTIATE] OpenAI API error:', openaiError);
      throw openaiError;
    }

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }
    
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.error('[DIFFERENTIATE] JSON parse error:', parseError, 'Content:', content);
      throw parseError;
    }
    let variations = [];
    if (parsedContent && Array.isArray(parsedContent.variations)) {
      variations = parsedContent.variations.map((variation: string | { text?: string; title?: string }) => {
        if (typeof variation === 'string') {
          // Handle old format (just string)
          return { text: variation, title: 'Differentiated Version' };
        }
        return {
          text: variation.text || 'No text provided',
          title: variation.title || 'Differentiated Version'
        };
      });
    } else {
      console.error('[DIFFERENTIATE] Response format error: missing variations array', parsedContent);
      throw new Error('Response is not in the expected format: missing variations array');
    }
    
    return NextResponse.json({ variations });
  } catch (error) {
    const err = error as Error;
    console.error('Error in differentiation API:', err);
    // Return error message in response for debugging (only for development)
    return NextResponse.json(
      { error: 'Failed to process assignment', message: err.message, stack: err.stack },
      { status: 500 }
    );
  }
} 