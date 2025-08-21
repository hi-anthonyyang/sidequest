import occupationData from '../../public/data/onet/json/Occupation Data_Occupation_Data.json';
import { CareerPath, Major } from './types';
import OpenAI from 'openai';

interface OccupationEntry {
  'O*NET-SOC Code': string;
  'Title': string;
  'Description': string;
}

const occupations = occupationData as OccupationEntry[];



/**
 * Get SOC code for a career title (for CareerOneStop API)
 */
export function getSOCCodeForCareer(careerTitle: string): string | null {
  const occupation = occupations.find(occ => 
    occ.Title.toLowerCase() === careerTitle.toLowerCase()
  );
  return occupation ? occupation['O*NET-SOC Code'] : null;
}

/**
 * Generate careers directly from student interests using O*NET database
 * This is the new Interest-First approach
 */
export async function generateCareersFromInterests(
  studentAnswers: string[],
  openai: OpenAI
): Promise<CareerPath[]> {
  if (!studentAnswers || studentAnswers.length === 0) {
    return [];
  }

  try {
    const studentText = studentAnswers.join(' ');
    
    // Create a focused sample of careers for LLM to choose from
    const careerSample = occupations.slice(0, 200).map(occ => ({
      code: occ['O*NET-SOC Code'],
      title: occ.Title,
      description: occ.Description.substring(0, 150) + '...'
    }));

    const prompt = `You are a career counselor analyzing a student's interests to recommend careers.

STUDENT'S RESPONSES: "${studentText}"

TASK: From the career list below, select the 5 careers that BEST match your expressed interests, personality, and goals.

Focus on:
- What activities you enjoy (hands-on, creative, analytical, helping people, etc.)
- Your work style preferences (team vs individual, structured vs flexible)
- Your motivations and values
- Skills you want to develop or use

AVAILABLE CAREERS:
${careerSample.map((career, i) => `${i + 1}. ${career.title} (${career.code}): ${career.description}`).join('\n')}

Return EXACTLY 5 career selections in this JSON format:
{
  "careers": [
    {
      "title": "Career Title",
      "socCode": "XX-XXXX.XX",
      "matchReason": "Brief explanation of why this matches your interests (max 420 chars)"
    }
  ]
}

Choose careers that genuinely align with your responses, not generic ones.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200, // Increased for longer matchReason descriptions
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content || '';
    const parsed = JSON.parse(response);
    
    if (!parsed.careers || !Array.isArray(parsed.careers)) {
      throw new Error('Invalid response format');
    }

    // Convert to CareerPath format
    const careers: CareerPath[] = parsed.careers.slice(0, 5).map((career: { title: string; socCode: string; matchReason: string }) => {
      const occupation = occupations.find(occ => occ['O*NET-SOC Code'] === career.socCode);
      
      return {
        title: career.title,
        description: occupation?.Description || career.matchReason || 'Career opportunity based on your interests.',
        relatedMajors: [], // Will be filled in Phase 2
        majorConnection: career.matchReason || `This career aligns with your expressed interests and goals.`,
        // These will be enriched later
        salary: undefined,
        growthOutlook: undefined,
        educationLevel: undefined
      };
    });

    console.log(`Generated ${careers.length} careers from student interests`);
    return careers;

  } catch (error) {
    console.warn('Interest-to-career generation failed:', error);
    
    // Fallback: return a few generic careers
    return [
      {
        title: 'Business Analyst',
        description: 'Analyze business processes and recommend improvements.',
        relatedMajors: [],
        majorConnection: 'This career offers diverse opportunities to apply analytical thinking.',
        salary: undefined,
        growthOutlook: undefined,
        educationLevel: undefined
      }
    ];
  }
}



/**
 * Generate majors from careers using university data
 * This completes the Interest-First workflow: Interests → Careers → Majors
 */
export async function generateMajorsFromCareers(
  careers: CareerPath[],
  universityData: { majors: Array<{ name: string; department?: string; description?: string; requirements?: string[] }>; university?: { name?: string } },
  openai: OpenAI
): Promise<{ majors: Major[], updatedCareers: CareerPath[] }> {
  if (!careers || careers.length === 0 || !universityData?.majors) {
    return { majors: [], updatedCareers: careers };
  }

  try {
    // Extract available majors from university
    const availableMajors = universityData.majors.map((major) => ({
      name: major.name,
      department: major.department || '',
      description: major.description || `${major.name} program at ${universityData.university?.name || 'this university'}.`,
      requirements: major.requirements || []
    }));

    const careerList = careers.map(career => 
      `${career.title}: ${career.description.substring(0, 100)}...`
    ).join('\n');

    const majorList = availableMajors.map((major, i: number) => 
      `${i + 1}. ${major.name} (${major.department})`
    ).join('\n');

    const prompt = `You are an academic advisor helping a student choose majors based on their career interests.

STUDENT'S CAREER INTERESTS:
${careerList}

AVAILABLE MAJORS AT THIS UNIVERSITY:
${majorList}

TASK: Select the 3-5 majors that would BEST prepare you for your career interests.

CRITICAL: Use the EXACT major names from the list above. Do not abbreviate or modify the names.

Consider:
- Which majors provide the foundational knowledge and skills needed for these careers
- Academic pathways that lead to these career opportunities
- Interdisciplinary connections between majors and careers

Return in this JSON format:
{
  "majors": [
    {
      "name": "EXACT Major Name from the list above - copy it exactly including all punctuation and suffixes",
      "description": "Clear, informative 2-3 sentence description of what students will learn, skills they'll develop, and career opportunities this major provides. Connect it to their interests and be specific about outcomes.",
      "relevanceReason": "Brief explanation of how this major connects to their careers (max 420 chars)"
    }
  ],
  "careerMajorConnections": [
    {
      "careerTitle": "Exact Career Title",
      "connectedMajors": ["Major Name 1", "Major Name 2"]
    }
  ]
}

Choose majors that genuinely connect to the careers, not just popular ones. Make descriptions informative and straightforward, focusing on practical skills and career preparation rather than exciting language.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000, // Increased for richer major descriptions
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content || '';
    const parsed = JSON.parse(response);

    if (!parsed.majors || !Array.isArray(parsed.majors)) {
      throw new Error('Invalid response format');
    }

    // Convert to Major format with improved name matching
    const selectedMajors: Major[] = parsed.majors.slice(0, 5).map((major: { name: string; description: string; relevanceReason: string }) => {
      // Try exact match first, then partial matches with better logic
      let universityMajor = availableMajors.find((um) => 
        um.name.toLowerCase() === major.name.toLowerCase()
      );
      
      if (!universityMajor) {
        // Try finding university major that starts with the LLM major name
        universityMajor = availableMajors.find((um) => 
          um.name.toLowerCase().startsWith(major.name.toLowerCase()) ||
          major.name.toLowerCase().startsWith(um.name.toLowerCase())
        );
      }
      
      if (!universityMajor) {
        // Fallback: try contains logic but prioritize university name containing LLM name
        universityMajor = availableMajors.find((um) => 
          um.name.toLowerCase().includes(major.name.toLowerCase())
        ) || availableMajors.find((um) => 
          major.name.toLowerCase().includes(um.name.toLowerCase())
        );
      }
      
      // Debug logging to see what's happening
      if (!universityMajor) {
        console.warn(`No match found for LLM major: "${major.name}"`);
      } else {
        console.log(`Matched "${major.name}" → "${universityMajor.name}" (${universityMajor.department})`);
      }

      return {
        name: universityMajor?.name || major.name,
        department: universityMajor?.department || '',
        // Use LLM-generated rich description, fallback to university description, then generic
        description: major.description || universityMajor?.description || `${major.name} provides comprehensive education and training in this field, preparing students for diverse career opportunities.`,
        requirements: universityMajor?.requirements || []
      };
    });

    // Update careers with related majors
    const updatedCareers: CareerPath[] = careers.map(career => {
      const connections = parsed.careerMajorConnections?.find((conn: { careerTitle: string; connectedMajors: string[] }) => 
        conn.careerTitle === career.title
      );
      
      const relatedMajors = connections?.connectedMajors || [selectedMajors[0]?.name || ''];
      
      return {
        ...career,
        relatedMajors: relatedMajors.filter(Boolean)
      };
    });

    console.log(`Generated ${selectedMajors.length} majors from ${careers.length} careers`);
    return { majors: selectedMajors, updatedCareers };

  } catch (error) {
    console.warn('Career-to-major generation failed:', error);
    
    // Fallback: return a few generic majors
    const fallbackMajors = universityData.majors.slice(0, 3).map((major) => ({
      name: major.name,
      department: major.department || '',
      description: major.description || `${major.name} provides comprehensive education and training in this field, preparing students for diverse career opportunities.`,
      requirements: major.requirements || []
    }));

    const updatedCareers = careers.map(career => ({
      ...career,
      relatedMajors: [fallbackMajors[0]?.name || 'General Studies']
    }));

    return { majors: fallbackMajors, updatedCareers };
  }
}

/**
 * Generate personalized connections between careers and majors using LLM
 */
export async function generateCareerConnections(
  careers: CareerPath[],
  studentAnswers: string[],
  openai: OpenAI
): Promise<CareerPath[]> {
  if (careers.length === 0) {
    return careers;
  }

  try {
    const studentText = studentAnswers.join(' ');
    const careerList = careers.map((career, i) => 
      `${i + 1}. Major: ${career.relatedMajors[0]}, Career: ${career.title}`
    ).join('\n');

    const prompt = `You are a career counselor creating personalized connections for a student.

STUDENT'S RESPONSES: "${studentText}"

TASK: For each major-career pair, write an engaging 1-2 sentence connection that:
- Identifies your expressed interests/strengths from your responses
- Explains WHY this career path might excite you based on your responses  
- Uses motivating, direct "you" language that mirrors your voice

EXAMPLES:
- Your passion for helping others and understanding human behavior makes Psychology ideal for Clinical Psychology - you'll master therapeutic techniques and research methods to transform lives.
- Your creative problem-solving and love for technology align perfectly with Computer Science leading to Software Development - you'll build innovative solutions that impact millions.

MAJOR-CAREER PAIRS:
${careerList}

Return ${careers.length} numbered connections (max 420 characters each). Use direct "you" language and include your actual words when relevant to make you feel heard and understood.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800, // Increased for longer career connections
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || '';
    const connections = response
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .map(line => line.replace(/^["']|["']$/g, '')) // Remove quotes from start/end
      .filter(Boolean);

    // Apply connections to careers
    return careers.map((career, index) => ({
      ...career,
      majorConnection: connections[index] || 
        `${career.relatedMajors[0]} provides the foundational knowledge and skills needed for ${career.title}.`
    }));

  } catch (error) {
    console.warn('Failed to generate career connections:', error);
    // Return careers with generic fallback connections
    return careers.map(career => ({
      ...career,
      majorConnection: `${career.relatedMajors[0]} provides the foundational knowledge and skills needed for ${career.title}.`
    }));
  }
}
