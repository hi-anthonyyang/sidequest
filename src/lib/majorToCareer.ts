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
 * Major field to O*NET occupation mapping
 * Maps academic fields to relevant SOC codes
 */
const MAJOR_TO_SOC_MAP: Record<string, string[]> = {
  // Psychology
  'Psychology': ['19-3033.00', '21-1014.00', '13-1071.00', '25-2012.00'], // Clinical Psychologists, Mental Health Counselors, HR Specialists, Elementary Teachers
  
  // Business & Management  
  'Business': ['11-2021.00', '13-2051.00', '11-1021.00', '13-1161.00'], // Marketing Managers, Financial Analysts, General Managers, Market Research Analysts
  'Business Administration': ['11-2021.00', '13-2051.00', '11-1021.00', '13-1161.00'],
  'Marketing': ['11-2021.00', '13-1161.00', '27-3031.00'], // Marketing Managers, Market Research Analysts, Public Relations Specialists
  'Finance': ['13-2051.00', '13-2052.00', '13-2061.00'], // Financial Analysts, Personal Financial Advisors, Financial Examiners
  
  // Communication & Media
  'Communication': ['27-3031.00', '27-3042.00', '27-1024.00'], // Public Relations Specialists, Technical Writers, Graphic Designers  
  'Journalism': ['27-3022.00', '27-3041.00', '27-4032.00'], // Reporters, Editors, Film/Video Editors
  
  // Arts & Design
  'Art': ['27-1024.00', '29-1129.01', '25-4012.00'], // Graphic Designers, Art Therapists, Curators
  'Graphic Design': ['27-1024.00', '27-1014.00', '15-1255.00'], // Graphic Designers, Multimedia Artists, Web Designers
  
  // Computer Science & Technology
  'Computer Science': ['15-1252.00', '15-1211.00', '15-1255.00', '15-1244.00'], // Software Developers, Computer Systems Analysts, Web Developers, Database Administrators
  'Information Technology': ['15-1244.00', '15-1142.00', '15-1211.00'], // Database Administrators, Network Support Specialists, Computer Systems Analysts
  
  // Sciences
  'Biology': ['19-1042.00', '29-9011.00', '19-4021.00'], // Medical Scientists, Occupational Health Specialists, Biological Technicians
  'Chemistry': ['19-2031.00', '19-4031.00', '15-2041.00'], // Chemists, Chemical Technicians, Statisticians
  'Environmental Science': ['19-2041.00', '17-2081.00', '19-4042.00'], // Environmental Scientists, Environmental Engineers, Environmental Technicians
  
  // Education
  'Education': ['25-2021.00', '25-2012.00', '11-9032.00'], // Elementary Teachers, Kindergarten Teachers, Education Administrators
  'Elementary Education': ['25-2021.00', '25-2012.00'], // Elementary Teachers, Kindergarten Teachers
  
  // Social Sciences
  'Sociology': ['21-1023.00', '19-3041.00', '21-1093.00'], // Mental Health/Substance Abuse Social Workers, Sociologists, Social/Human Service Assistants
  'Social Work': ['21-1023.00', '21-1021.00', '21-1093.00'], // Mental Health Social Workers, Child/Family Social Workers, Social Service Assistants
  'Political Science': ['19-3094.00', '23-2011.00', '25-1065.00'], // Political Scientists, Paralegals, Political Science Teachers
  'History': ['25-1125.00', '25-4012.00', '27-3022.00'], // History Teachers, Curators, Reporters
  'Anthropology': ['19-3091.00', '25-4012.00', '19-3093.00'], // Anthropologists, Curators, Historians
  
  // Economics & Statistics
  'Economics': ['19-3011.00', '13-2051.00', '15-2041.00'], // Economists, Financial Analysts, Statisticians
  
  // Health Sciences
  'Nursing': ['29-1141.00', '29-1151.00', '29-1171.00'], // Registered Nurses, Nurse Anesthetists, Nurse Practitioners
  'Public Health': ['19-1041.00', '21-1022.00', '29-9011.00'], // Epidemiologists, Healthcare Social Workers, Occupational Health Specialists
  
  // Engineering (common fields)
  'Engineering': ['17-2141.00', '17-2051.00', '17-2112.00'], // Mechanical Engineers, Civil Engineers, Industrial Engineers
  'Civil Engineering': ['17-2051.00', '17-3022.00'], // Civil Engineers, Civil Engineering Technicians
  'Mechanical Engineering': ['17-2141.00', '17-3027.00'], // Mechanical Engineers, Mechanical Engineering Technicians
  
  // Agriculture & Life Sciences
  'Agricultural Business': ['11-9013.00', '13-1051.00', '25-9021.00'], // Farm Managers, Cost Estimators, Farm/Home Management Advisors
  'Animal Science': ['19-1011.00', '29-1131.00', '19-4021.00'], // Animal Scientists, Veterinarians, Biological Technicians
  'Agriculture': ['11-9013.00', '19-1011.00', '25-9021.00'], // Farm Managers, Animal Scientists, Agricultural Advisors
  
  // Architecture & Design
  'Architecture': ['17-1011.00', '17-3011.00', '27-1025.00'], // Architects, Architectural Drafters, Interior Designers
  'Architectural Studies': ['17-1011.00', '17-3011.00', '27-1025.00'], // Architects, Architectural Drafters, Interior Designers
  
  // Specialized Sciences
  'Biochemistry': ['19-1021.00', '19-2031.00', '19-1042.00'], // Biochemists, Chemists, Medical Scientists
  'Physics': ['19-2012.00', '25-1054.00', '17-2199.00'], // Physicists, Physics Teachers, Engineers
  'Mathematics': ['15-2021.00', '25-1022.00', '15-2041.00'], // Mathematicians, Math Teachers, Statisticians
  
  // Ethnic & Cultural Studies
  'Africana Studies': ['25-1062.00', '19-3093.00', '27-3022.00'], // Area Studies Teachers, Historians, Reporters
  'Ethnic Studies': ['25-1062.00', '19-3093.00', '21-1093.00'], // Area Studies Teachers, Historians, Social Service Assistants
  
  // Liberal Arts & Humanities  
  'Liberal Arts': ['25-1123.00', '27-3041.00', '13-1151.00'], // English Teachers, Editors, Training Specialists
  'Philosophy': ['25-1126.00', '23-1011.00', '27-3041.00'], // Philosophy Teachers, Lawyers, Editors
  'Religious Studies': ['21-2011.00', '25-1126.00', '21-1093.00'] // Clergy, Philosophy Teachers, Social Service Assistants
};

/**
 * Smart fallback mapping for unmapped major fields
 */
const FALLBACK_MAPPING: Record<string, string> = {
  // Agriculture-related
  'Agricultural': 'Agriculture',
  'Farm': 'Agriculture',
  'Ranch': 'Agriculture',
  
  // Animal-related
  'Animal': 'Animal Science',
  'Veterinary': 'Animal Science',
  'Dairy': 'Animal Science',
  'Livestock': 'Animal Science',
  
  // Studies/Cultural fields
  'Studies': 'Liberal Arts',
  'Cultural': 'Ethnic Studies',
  
  // Science fields
  'Science': 'Biology',
  'Chemistry': 'Chemistry',
  'Math': 'Mathematics',
  
  // Arts fields
  'Design': 'Art',
  'Media': 'Communication',
  'Film': 'Communication',
  
  // Education fields
  'Teaching': 'Education',
  'Teacher': 'Education',
};

/**
 * Get careers for a given major using O*NET data
 */
export function getCareersForMajor(majorName: string): CareerPath[] {
  // Extract field name from full major title (e.g., "Psychology, B.A." -> "Psychology")
  const fieldName = majorName.split(',')[0].trim();
  
  // Try direct mapping first
  let socCodes = MAJOR_TO_SOC_MAP[fieldName] || [];
  
  // If no direct match, try fallback mapping
  if (socCodes.length === 0) {
    for (const [keyword, mappedField] of Object.entries(FALLBACK_MAPPING)) {
      if (fieldName.toLowerCase().includes(keyword.toLowerCase())) {
        socCodes = MAJOR_TO_SOC_MAP[mappedField] || [];
        console.log(`Fallback mapping: "${fieldName}" → "${mappedField}"`);
        break;
      }
    }
  }
  
  // If still no match, use generic Liberal Arts mapping
  if (socCodes.length === 0) {
    socCodes = MAJOR_TO_SOC_MAP['Liberal Arts'] || [];
    console.log(`Generic fallback: "${fieldName}" → Liberal Arts careers`);
  }
  
  // Find matching occupations in O*NET data
  const careers: CareerPath[] = [];
  
  for (const socCode of socCodes) {
    const occupation = occupations.find(occ => occ['O*NET-SOC Code'] === socCode);
    if (occupation && careers.length < 8) { // Get up to 8 per major for variety
      careers.push({
        title: occupation.Title,
        description: occupation.Description || `Professional opportunities in ${fieldName.toLowerCase()} utilizing specialized knowledge and skills.`,
        relatedMajors: [majorName],
        // These will be filled by CareerOneStop API
        salary: undefined,
        growthOutlook: undefined,
        educationLevel: undefined
      });
    }
  }
  
  return careers;
}

/**
 * Generate careers from multiple majors, ensuring diversity and relevance
 */
export function generateCareersFromMajors(majors: Major[]): CareerPath[] {
  const allCareers: CareerPath[] = [];
  const seenTitles = new Set<string>();
  
  // Get careers for each major
  for (const major of majors) {
    const majorCareers = getCareersForMajor(major.name);
    
    // Add unique careers (avoid duplicates across majors)
    for (const career of majorCareers) {
      if (!seenTitles.has(career.title) && allCareers.length < 15) {
        allCareers.push(career);
        seenTitles.add(career.title);
      }
    }
  }
  
  // Return top 5 most relevant careers
  // Prioritize careers that match multiple majors or are from top majors
  return allCareers.slice(0, 5);
}

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
- Identifies their expressed interests/strengths from their responses
- Explains WHY this career path might excite them based on their responses
- Uses motivating, "you-focused" language that mirrors their voice

EXAMPLES:
- Your passion for helping others and understanding human behavior makes Psychology ideal for Clinical Psychology - you'll master therapeutic techniques and research methods to transform lives.
- Your creative problem-solving and love for technology align perfectly with Computer Science leading to Software Development - you'll build innovative solutions that impact millions.

MAJOR-CAREER PAIRS:
${careerList}

Return ${careers.length} numbered connections (max 180 characters each). Include their actual words when relevant to make them feel heard and understood.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
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
