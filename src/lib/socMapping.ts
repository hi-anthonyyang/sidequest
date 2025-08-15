import occupationData from '../../public/data/onet/json/Occupation Data_Occupation_Data.json';

interface OccupationEntry {
  'O*NET-SOC Code': string;
  'Title': string;
  'Description': string;
}

// Type assertion for the imported JSON data
const occupations = occupationData as OccupationEntry[];

/**
 * Find SOC code by exact title match
 */
function findExactMatch(careerTitle: string): string | null {
  const normalizedInput = careerTitle.toLowerCase().trim();
  
  const match = occupations.find(occ => 
    occ.Title.toLowerCase() === normalizedInput
  );
  
  return match ? match['O*NET-SOC Code'] : null;
}

/**
 * Find SOC code by fuzzy keyword matching
 * Looks for careers that contain key words from the input
 */
function findKeywordMatch(careerTitle: string): string | null {
  const inputWords = careerTitle
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2); // Ignore short words like "of", "and"
  
  if (inputWords.length === 0) return null;
  
  let bestMatch: OccupationEntry | null = null;
  let bestScore = 0;
  
  for (const occupation of occupations) {
    const titleWords = occupation.Title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/);
    
    // Count how many input words appear in this occupation title
    let matchCount = 0;
    for (const inputWord of inputWords) {
      if (titleWords.some(titleWord => titleWord.includes(inputWord) || inputWord.includes(titleWord))) {
        matchCount++;
      }
    }
    
    const score = matchCount / inputWords.length;
    
    // Require at least 50% of words to match
    if (score > 0.5 && score > bestScore) {
      bestScore = score;
      bestMatch = occupation;
    }
  }
  
  return bestMatch ? bestMatch['O*NET-SOC Code'] : null;
}

/**
 * Map career title to SOC code using multiple strategies
 * Returns SOC code if found, null otherwise
 */
export function mapCareerToSOC(careerTitle: string): string | null {
  if (!careerTitle?.trim()) return null;
  
  // Strategy 1: Try exact match first
  const exactMatch = findExactMatch(careerTitle);
  if (exactMatch) {
    return exactMatch;
  }
  
  // Strategy 2: Try keyword-based fuzzy matching
  const keywordMatch = findKeywordMatch(careerTitle);
  if (keywordMatch) {
    return keywordMatch;
  }
  
  return null;
}

/**
 * Get occupation title by SOC code (for debugging/logging)
 */
export function getOccupationBySOC(socCode: string): OccupationEntry | null {
  return occupations.find(occ => occ['O*NET-SOC Code'] === socCode) || null;
}
