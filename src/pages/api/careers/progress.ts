import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

// Load and cache unique skills data
let uniqueSkills: Record<string, { id: string; name: string }> | null = null;
function getUniqueSkills() {
  if (!uniqueSkills) {
    const filePath = path.join(process.cwd(), 'src/data/onet/json/unique_skills.json');
    uniqueSkills = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return uniqueSkills;
}

// Load and cache occupation-skills mapping
let occupationSkills: Record<string, Record<string, { importance: number; level: number }>> | null = null;
function getOccupationSkills() {
  if (!occupationSkills) {
    const filePath = path.join(process.cwd(), 'src/data/onet/json/occupation_skills.json');
    occupationSkills = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return occupationSkills;
}

interface Career {
  'O*NET-SOC Code': string;
  Title: string;
  Description: string;
  // add other fields as needed
}

interface AchievedSkill {
  elementId: string;
}

let careersData: Career[] | null = null;
function getCareersData() {
  if (!careersData) {
    const filePath = path.join(process.cwd(), 'src/data/onet/json/Occupation Data_Occupation_Data.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    careersData = JSON.parse(raw);
  }
  return careersData;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { achievedSkills } = req.body; // [{ elementId }]
  if (!Array.isArray(achievedSkills)) {
    res.status(400).json({ error: 'Missing achievedSkills array in body' });
    return;
  }

  const uniqueSkillsMap = getUniqueSkills();
  const occSkillsMap = getOccupationSkills();
  const careers = getCareersData();
  if (!uniqueSkillsMap || !occSkillsMap || !careers) {
    res.status(500).json({ error: 'Skills or careers data not loaded' });
    return;
  }

  // Set of achieved skill IDs
  const achievedIds = new Set((achievedSkills as AchievedSkill[]).map((s) => s.elementId));
  console.log('API DEBUG: achievedIds', Array.from(achievedIds));

  // For each career, calculate progress
  const results = careers.map(career => {
    const code = career['O*NET-SOC Code'];
    const requiredSkills = occSkillsMap[code] || {};
    const requiredSkillIds = Object.keys(requiredSkills);
    const achieved = requiredSkillIds.filter(id => achievedIds.has(id));
    const progress = achieved.length / requiredSkillIds.length;
    let state: 'locked' | 'unlocked' = 'locked';
    if (progress === 1) state = 'unlocked';
    return {
      code,
      title: career['Title'],
      description: career['Description'],
      requiredSkills: requiredSkillIds.map(id => ({
        ...uniqueSkillsMap[id],
        importance: requiredSkills[id]?.importance || 0,
        level: requiredSkills[id]?.level || 0
      })),
      achievedSkills: achieved,
      progress,
      state,
      total: requiredSkillIds.length,
      achievedCount: achieved.length,
      missingSkills: requiredSkillIds.filter(id => !achieved.includes(id)),
    };
  });
  console.log('API DEBUG: results (first 5)', results.slice(0, 5));

  res.status(200).json({ results });
} 