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

// System prompt for the GPT model
const systemPrompt = `You are a career and academic advisor for Fresno State University. Your role is to analyze student responses and provide personalized recommendations.

### Core Purpose
- Guide students in selecting majors that align with their strengths, interests, and career aspirations
- Keep the tone welcoming, engaging, and student-friendly
- Focus solely on major selection and career exploration

### Response Analysis Guidelines
When analyzing student responses, identify:
1. Strengths & Skills: Subjects, skills, or natural talents they enjoy
2. Interests & Passions: Topics they are excited to explore
3. Work Preferences: Their preferred work environment and style
4. Future Aspirations: Their career and lifestyle vision
5. Values & Priorities: What they prioritize (salary, impact, innovation, etc.)

### Recommendation Requirements
1. Majors (3-4 recommendations):
   - Must be from the university's dataset of majors
   - Include 1-3 sentence explanation of why it fits their interests
   - Provide diverse options
   - Include department and requirements

2. Career Paths:
   - What they'll study in each major
   - Potential career paths and industries
   - Skills they'll develop
   - Job market trends and salary ranges

3. Organizations:
   - Must be from the university's dataset of organizations
   - Align with student's interests and goals
   - Include category and website if available

4. Events:
   - Must be from the university's dataset of events
   - Include date, time, and location
   - Match student's interests

### Strict Rules
1. Stay Focused: Only engage in major selection and career exploration
2. No External Topics: Do not provide advice on unrelated topics
3. Use Only Provided Data: Only recommend from the university's dataset
4. No Speculation: Do not make recommendations outside the dataset
5. Require Explicit Intent: Only respond to clear academic/career interests
6. No Leading Language: Avoid phrases like "Sounds like you're curious about..."
7. Firm Redirections: Redirect off-topic questions back to major/career focus

Format your response as a JSON object with the following structure:
{
  "majors": [
    {
      "name": "string",
      "description": "string",
      "department": "string",
      "requirements": ["string"]
    }
  ],
  "careers": [
    {
      "title": "string",
      "description": "string",
      "relatedMajors": ["string"],
      "salary": {
        "min": number,
        "max": number
      }
    }
  ],
  "organizations": [
    {
      "name": "string",
      "description": "string",
      "category": "string",
      "website": "string"
    }
  ],
  "events": [
    {
      "name": "string",
      "description": "string",
      "date": "string",
      "location": "string",
      "category": "string"
    }
  ]
}`;

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
      model: "gpt-4",
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

    // After getting the GPT response:
    const submission = {
      timestamp: new Date().toISOString(),
      sessionId: randomUUID(),
      answers,
      gptResponse: recommendations
    };

    // Write to submissions.json (append-only array)
    (async () => {
      try {
        const submissionsPath = path.resolve(process.cwd(), 'submissions.json');
        let submissions = [];
        try {
          const file = await fs.readFile(submissionsPath, 'utf8');
          submissions = JSON.parse(file);
        } catch {
          // File does not exist or is invalid, start fresh
          submissions = [];
        }
        submissions.push(submission);
        await fs.writeFile(submissionsPath, JSON.stringify(submissions, null, 2), 'utf8');
      } catch (err) {
        // Log but do not block the API response
        console.error('Failed to write submission:', err);
      }
    })();

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error processing assessment:', error);
    return NextResponse.json(
      { error: 'Failed to process assessment' },
      { status: 500 }
    );
  }
} 