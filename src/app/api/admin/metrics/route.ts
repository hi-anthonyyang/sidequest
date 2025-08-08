import { NextResponse } from 'next/server';
import { getAssessStats } from '@/lib/metrics';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range');
  const ranges: Record<string, number> = {
    today: 24 * 60 * 60 * 1000,
    last3d: 3 * 24 * 60 * 60 * 1000,
    last5d: 5 * 24 * 60 * 60 * 1000,
    last30d: 30 * 24 * 60 * 60 * 1000,
  };
  const rangeMs = range && ranges[range] ? ranges[range] : undefined;
  const assess = getAssessStats(rangeMs);
  return NextResponse.json({ assess });
}


