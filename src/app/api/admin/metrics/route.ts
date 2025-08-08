import { NextResponse } from 'next/server';
import { getAssessStats } from '@/lib/metrics';

export async function GET() {
  const assess = getAssessStats();
  return NextResponse.json({ assess });
}


