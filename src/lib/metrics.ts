// Ephemeral in-memory metrics for simple admin dashboard
// Note: resets on deploy/instance restart

type MetricEntry = { ts: number; durationMs: number; ok: boolean };
const assessEntries: MetricEntry[] = [];

export function recordAssess(durationMs: number, ok: boolean): void {
  assessEntries.push({ ts: Date.now(), durationMs: Math.max(0, Math.round(durationMs)), ok });
  if (assessEntries.length > 10000) assessEntries.splice(0, assessEntries.length - 6000);
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
}

export function getAssessStats(rangeMs?: number) {
  const now = Date.now();
  const windowed = rangeMs && rangeMs > 0 ? assessEntries.filter(e => now - e.ts <= rangeMs) : assessEntries;
  const durations = windowed.map(e => e.durationMs).filter(n => n > 0);
  const count = windowed.length;
  const errors = windowed.filter(e => !e.ok).length;
  return {
    count,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    errors,
  };
}


