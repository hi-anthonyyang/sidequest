import { CareerPath } from '@/lib/types';
import { mapCareerToSOC, getOccupationBySOC } from '@/lib/socMapping';

interface CareerOneStopResponse {
  OccupationDetail?: Array<{
    OnetTitle?: string;
    OnetCode?: string;
    BrightOutlook?: string;
    Wages?: {
      NationalWagesList?: Array<{
        RateType?: string;
        Median?: string;
        Pct10?: string;
        Pct90?: string;
      }>;
    };
    EducationTraining?: {
      EducationType?: Array<{
        EducationLevel?: string;
        Value?: string;
      }>;
    };
  }>;
}

interface EnrichedCareerData {
  salaryMin?: number;
  salaryMax?: number;
  growthOutlook?: string;
  educationLevel?: string;
}

// Map CareerOneStop education codes to readable labels
function mapEducationLevel(educationTypes?: Array<{EducationLevel?: string; Value?: string}>): string {
  if (!educationTypes || educationTypes.length === 0) return '';
  
  // Find the education type with the highest value (most common requirement)
  const sortedEducation = educationTypes
    .filter(et => et.EducationLevel && et.Value)
    .sort((a, b) => parseFloat(b.Value!) - parseFloat(a.Value!));
  
  const topEducation = sortedEducation[0]?.EducationLevel;
  if (!topEducation) return '';
  
  const eduLower = topEducation.toLowerCase();
  
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
  
  return topEducation; // Return original if no match
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
    // Use correct API endpoint with required query parameters
    const url = `https://api.careeronestop.org/v1/occupation/${userId}/${socCode}/US?wages=true&training=true&projectedEmployment=true`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(`CareerOneStop API error for SOC ${socCode}:`, response.status, response.statusText);
      return null;
    }

    const data: CareerOneStopResponse = await response.json();
    const occupation = data.OccupationDetail?.[0];
    
    if (!occupation) {
      return null;
    }

    // Extract salary data from NationalWagesList (prefer Annual wages)
    const annualWage = occupation.Wages?.NationalWagesList?.find(w => w.RateType === 'Annual');
    const salaryMin = annualWage?.Pct10 ? parseFloat(annualWage.Pct10) : undefined;
    const salaryMax = annualWage?.Pct90 ? parseFloat(annualWage.Pct90) : undefined;
    
    return {
      salaryMin,
      salaryMax,
      growthOutlook: mapGrowthOutlook(occupation.BrightOutlook),
      educationLevel: mapEducationLevel(occupation.EducationTraining?.EducationType),
    };
    
  } catch (error) {
    console.warn(`CareerOneStop API request failed for SOC ${socCode}:`, error);
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
    
    const url = `https://api.careeronestop.org/v1/occupation/${userId}/${encodedTitle}/US?wages=true&training=true&projectedEmployment=true`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(`CareerOneStop API error for title "${careerTitle}":`, response.status, response.statusText);
      return null;
    }

    const data: CareerOneStopResponse = await response.json();
    const occupation = data.OccupationDetail?.[0];
    
    if (!occupation) {
      return null;
    }

    // Extract salary data from NationalWagesList (prefer Annual wages)
    const annualWage = occupation.Wages?.NationalWagesList?.find(w => w.RateType === 'Annual');
    const salaryMin = annualWage?.Pct10 ? parseFloat(annualWage.Pct10) : undefined;
    const salaryMax = annualWage?.Pct90 ? parseFloat(annualWage.Pct90) : undefined;
    
    return {
      salaryMin,
      salaryMax,
      growthOutlook: mapGrowthOutlook(occupation.BrightOutlook),
      educationLevel: mapEducationLevel(occupation.EducationTraining?.EducationType),
    };
    
  } catch (error) {
    console.warn(`CareerOneStop API request failed for title "${careerTitle}":`, error);
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
