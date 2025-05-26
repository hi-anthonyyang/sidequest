import { NextRequest, NextResponse } from 'next/server';
import Fuse from 'fuse.js';
import path from 'path';
import fs from 'fs';

// Path to the skills JSON file
const SKILLS_PATH = path.join(process.cwd(), 'src/data/onet/json/Skills_Skills.json');

interface Skill {
  id: string;
  name: string;
  occupations: string[];
  raw: Record<string, unknown>;
}

// Cache for skills and Fuse instance
let skillsCache: Skill[] = [];
let fuseCache: Fuse<Skill> | null = null;

function loadSkills() {
  if (skillsCache.length === 0) {
    const raw = fs.readFileSync(SKILLS_PATH, 'utf8');
    const data = JSON.parse(raw);
    const nameField = "Element Name";
    const idField = "Element ID";
    const occField = "O*NET-SOC Code";
    const skillMap = new Map<string, Skill>();
    data.forEach((item: Record<string, any>) => {
      const id = item[idField];
      const name = item[nameField];
      const occ = item[occField];
      if (!skillMap.has(id)) {
        skillMap.set(id, { id, name, occupations: [occ], raw: item });
      } else {
        skillMap.get(id)!.occupations.push(occ);
      }
    });
    skillsCache = Array.from(skillMap.values());
    fuseCache = new Fuse(skillsCache, {
      keys: ['name'],
      threshold: 0.4,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  if (q.length < 3) {
    return NextResponse.json({ results: [], hasMore: false });
  }
  loadSkills();
  const results = fuseCache!.search(q, { limit: offset + 6 });
  const sliced = results.slice(offset, offset + 5).map(r => r.item);
  const hasMore = results.length > offset + 5;
  return NextResponse.json({ results: sliced, hasMore });
} 