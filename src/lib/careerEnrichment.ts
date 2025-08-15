import { CareerPath } from '@/lib/types';
import { mapCareerToSOC, getOccupationBySOC } from '@/lib/socMapping';

interface CareerOneStopResponse {
  OccupationDetail?: Array<{
    OnetTitle?: string;
    OnetCode?: string;
    TypicalEducation?: string;
    BrightOutlook?: string;
    Wages?: Array<{
      RateType?: string;
      Median?: number;
      Pct10?: number;
      Pct90?: number;
    }>;
  }>;
}

interface EnrichedCareerData {
  salaryMin?: number;
  salaryMax?: number;
  growthOutlook?: string;
  educationLevel?: string;
}

// Map CareerOneStop education codes to readable labels
function mapEducationLevel(education?: string): string {
  if (!education) return '';
  
  const eduLower = education.toLowerCase();
  
  if (eduLower.includes('high school') || eduLower.includes('no formal')) {
    return 'High school';
  }
  if (eduLower.includes('postsecondary') || eduLower.includes('certificate')) {
    return 'Certificate';
  }
  if (eduLower.includes('associate')) {
    return "Associate's degree";
  }
  if (eduLower.includes('bachelor')) {
    return "Bachelor's degree";
  }
  if (eduLower.includes('master')) {
    return "Master's degree";
  }
  if (eduLower.includes('doctoral') || eduLower.includes('professional')) {
    return 'Doctoral degree';
  }
  
  return education; // Return original if no match
}

// Map growth outlook to 1-2 word labels
function mapGrowthOutlook(brightOutlook?: string): string {
  if (!brightOutlook) return '';
  
  const outlook = brightOutlook.toLowerCase();
  
  if (outlook.includes('yes') || outlook.includes('bright') || outlook.includes('growing')) {
    return 'Growing';
  }
  if (outlook.includes('average') || outlook.includes('stable')) {
    return 'Stable';
  }
  if (outlook.includes('declining') || outlook.includes('slow')) {
    return 'Declining';
  }
  
  return 'Stable'; // Default fallback
}

async function fetchCareerDataBySOC(socCode: string): Promise<EnrichedCareerData | null> {
  const userId = process.env.CAREERONESTOP_USER_ID;
  const token = process.env.CAREERONESTOP_API_TOKEN;
  
  if (!userId || !token) {
    return null;
  }

  try {
    const url = `https://api.careeronestop.org/v1/occupation/${userId}/${socCode}/US?wages=true&outlook=true&education=true`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return null;
    }

    const data: CareerOneStopResponse = await response.json();
    const occupation = data.OccupationDetail?.[0];
    
    if (!occupation) {
      return null;
    }

    // Extract salary data (prefer annual wages)
    const annualWage = occupation.Wages?.find(w => w.RateType === 'Annual');
    const salaryMin = annualWage?.Pct10;
    const salaryMax = annualWage?.Pct90;
    
    return {
      salaryMin,
      salaryMax,
      growthOutlook: mapGrowthOutlook(occupation.BrightOutlook),
      educationLevel: mapEducationLevel(occupation.TypicalEducation),
    };
    
  } catch {
    return null;
  }
}

async function fetchCareerDataByTitle(careerTitle: string): Promise<EnrichedCareerData | null> {
  const userId = process.env.CAREERONESTOP_USER_ID;
  const token = process.env.CAREERONESTOP_API_TOKEN;
  
  if (!userId || !token) {
    return null;
  }

  try {
    // Clean career title for API call
    const cleanTitle = careerTitle.replace(/[^\w\s]/g, '').trim();
    const encodedTitle = encodeURIComponent(cleanTitle);
    
    const url = `https://api.careeronestop.org/v1/occupation/${userId}/${encodedTitle}/US?wages=true&outlook=true&education=true`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return null;
    }

    const data: CareerOneStopResponse = await response.json();
    const occupation = data.OccupationDetail?.[0];
    
    if (!occupation) {
      return null;
    }

    // Extract salary data (prefer annual wages)
    const annualWage = occupation.Wages?.find(w => w.RateType === 'Annual');
    const salaryMin = annualWage?.Pct10;
    const salaryMax = annualWage?.Pct90;
    
    return {
      salaryMin,
      salaryMax,
      growthOutlook: mapGrowthOutlook(occupation.BrightOutlook),
      educationLevel: mapEducationLevel(occupation.TypicalEducation),
    };
    
  } catch {
    return null;
  }
}

async function fetchCareerData(careerTitle: string): Promise<EnrichedCareerData | null> {
  const userId = process.env.CAREERONESTOP_USER_ID;
  const token = process.env.CAREERONESTOP_API_TOKEN;
  
  if (!userId || !token) {
    console.warn('CareerOneStop API credentials not configured');
    return null;
  }

  // Strategy 1: Try SOC code lookup first (more reliable)
  const socCode = mapCareerToSOC(careerTitle);
  if (socCode) {
    const occupation = getOccupationBySOC(socCode);
    console.log(`Mapped "${careerTitle}" → "${occupation?.Title}" (${socCode})`);
    
    const socResult = await fetchCareerDataBySOC(socCode);
    if (socResult) {
      return socResult;
    }
  }
  
  // Strategy 2: Fallback to title-based search
  console.log(`SOC lookup failed for "${careerTitle}", trying title search`);
  const titleResult = await fetchCareerDataByTitle(careerTitle);
  
  if (!titleResult) {
    console.warn(`CareerOneStop API: No data found for "${careerTitle}"`);
  }
  
  return titleResult;
}

export async function enrichCareersWithRealData(careers: CareerPath[]): Promise<CareerPath[]> {
  // Process careers in parallel but limit concurrency to avoid overwhelming the API
  const enrichPromises = careers.map(async (career) => {
    const enrichedData = await fetchCareerData(career.title);
    
    if (!enrichedData) {
      // Return original career if API call failed
      return career;
    }

    // Update salary if we got real data
    const updatedSalary = enrichedData.salaryMin && enrichedData.salaryMax 
      ? { min: Math.round(enrichedData.salaryMin), max: Math.round(enrichedData.salaryMax) }
      : career.salary;

    return {
      ...career,
      salary: updatedSalary,
      growthOutlook: enrichedData.growthOutlook,
      educationLevel: enrichedData.educationLevel,
    };
  });

  try {
    return await Promise.all(enrichPromises);
  } catch (error) {
    console.warn('Career enrichment failed:', error);
    return careers; // Return original careers if enrichment fails
  }
}
