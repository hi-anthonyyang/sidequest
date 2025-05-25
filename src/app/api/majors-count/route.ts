import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  const majorsCountPath = path.resolve(process.cwd(), 'majors_count.json');
  let count = 0;
  try {
    const file = await fs.readFile(majorsCountPath, 'utf8');
    const data = JSON.parse(file);
    count = typeof data.count === 'number' ? data.count : 0;
  } catch {
    count = 0;
  }
  return NextResponse.json({ count });
} 