import occupationData from '../../public/data/onet/json/Occupation Data_Occupation_Data.json';
import { CareerPath, Major } from './types';

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
};

/**
 * Get careers for a given major using O*NET data
 */
export function getCareersForMajor(majorName: string): CareerPath[] {
  // Extract field name from full major title (e.g., "Psychology, B.A." -> "Psychology")
  const fieldName = majorName.split(',')[0].trim();
  
  // Get SOC codes for this major field
  const socCodes = MAJOR_TO_SOC_MAP[fieldName] || [];
  
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
