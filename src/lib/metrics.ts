// Ephemeral in-memory metrics for simple admin dashboard
// Note: resets on deploy/instance restart

let assessDurations: number[] = [];
let assessCount = 0;
let assessErrors = 0;

export function recordAssess(durationMs: number, ok: boolean): void {
  assessCount += 1;
  if (durationMs > 0) assessDurations.push(durationMs);
  if (!ok) assessErrors += 1;
  if (assessDurations.length > 5000) assessDurations = assessDurations.slice(-2500);
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
}

export function getAssessStats() {
  return {
    count: assessCount,
    p50Ms: percentile(assessDurations, 50),
    p95Ms: percentile(assessDurations, 95),
    errors: assessErrors,
  };
}


