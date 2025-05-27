import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Load O*NET data files
const UNIQUE_SKILLS_PATH = path.join(process.cwd(), 'src/data/onet/json/unique_skills.json');
const OCCUPATION_SKILLS_PATH = path.join(process.cwd(), 'src/data/onet/json/occupation_skills.json');

interface SkillRating {
  importance: number;
  level: number;
}

interface OccupationSkills {
  [skillId: string]: SkillRating;
}

interface UniqueSkill {
  id: string;
  name: string;
  description?: string;
}

// Cache for data
let uniqueSkillsCache: Record<string, UniqueSkill> | null = null;
let occupationSkillsCache: Record<string, OccupationSkills> | null = null;

function loadData() {
  if (!uniqueSkillsCache) {
    const uniqueSkillsRaw = fs.readFileSync(UNIQUE_SKILLS_PATH, 'utf8');
    uniqueSkillsCache = JSON.parse(uniqueSkillsRaw);
  }
  if (!occupationSkillsCache) {
    const occupationSkillsRaw = fs.readFileSync(OCCUPATION_SKILLS_PATH, 'utf8');
    occupationSkillsCache = JSON.parse(occupationSkillsRaw);
  }
}

function getAverageRatings(skillId: string): SkillRating {
  if (!occupationSkillsCache) return { importance: 0, level: 0 };

  let totalImportance = 0;
  let totalLevel = 0;
  let count = 0;

  // Calculate average importance and level across all occupations
  Object.values(occupationSkillsCache).forEach(occupation => {
    if (occupation[skillId]) {
      totalImportance += occupation[skillId].importance;
      totalLevel += occupation[skillId].level;
      count++;
    }
  });

  return count > 0
    ? {
        importance: totalImportance / count,
        level: totalLevel / count,
      }
    : { importance: 0, level: 0 };
}

export async function POST(req: NextRequest) {
  try {
    const { query, offset = 0 } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }

    loadData();
    if (!uniqueSkillsCache) {
      return NextResponse.json({ error: 'Skills data not loaded' }, { status: 500 });
    }

    // Search for skills
    const searchQuery = query.toLowerCase();
    const results = Object.values(uniqueSkillsCache)
      .filter(skill => skill.name.toLowerCase().includes(searchQuery))
      .map(skill => {
        const ratings = getAverageRatings(skill.id);
        return {
          ...skill,
          importance: ratings.importance,
          level: ratings.level,
        };
      })
      .sort((a, b) => {
        // Sort by importance first, then by level
        if (a.importance !== b.importance) {
          return b.importance - a.importance;
        }
        return b.level - a.level;
      });

    return NextResponse.json({
      results: results.slice(offset),
      total: results.length,
    });
  } catch (error) {
    console.error('Error searching skills:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 