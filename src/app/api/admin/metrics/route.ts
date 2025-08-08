import { NextResponse } from 'next/server';

// In-memory counters (simple and ephemeral)
let assessDurations: number[] = [];
let assessCount = 0;
let assessErrors = 0;

export function recordAssess(durationMs: number, ok: boolean) {
  assessCount += 1;
  assessDurations.push(durationMs);
  if (!ok) assessErrors += 1;
  if (assessDurations.length > 5000) assessDurations = assessDurations.slice(-2500);
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
}

export async function GET() {
  const p50 = percentile(assessDurations, 50);
  const p95 = percentile(assessDurations, 95);
  return NextResponse.json({
    assess: {
      count: assessCount,
      p50Ms: p50,
      p95Ms: p95,
      errors: assessErrors,
    },
  });
}


