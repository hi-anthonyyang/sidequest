import { getSql } from '@/lib/db';

export interface AssessmentMetric {
  createdAt?: Date;
  universityId: string;
  latencyMs: number;
  success: boolean;
  model: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  commitSha?: string | null;
}

export interface AssessStats {
  count: number;
  errors: number;
  p50Ms: number;
  p95Ms: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
}

export async function ensureMetricsTables(): Promise<void> {
  const sql = getSql();
  await sql`
    create table if not exists assessment_metrics (
      id bigserial primary key,
      created_at timestamptz not null default now(),
      university_id text not null,
      latency_ms integer not null,
      success boolean not null,
      model text not null,
      prompt_tokens integer,
      completion_tokens integer,
      commit_sha text
    );
  `;

  await sql`
    create table if not exists assessment_metrics_daily (
      date date not null,
      university_id text not null,
      count integer not null,
      errors integer not null,
      p50_ms integer not null,
      p95_ms integer not null,
      total_prompt_tokens bigint not null default 0,
      total_completion_tokens bigint not null default 0,
      primary key (date, university_id)
    );
  `;
}

export async function saveAssessmentMetric(row: AssessmentMetric): Promise<void> {
  const sql = getSql();
  await ensureMetricsTables();
  await sql`
    insert into assessment_metrics (
      created_at, university_id, latency_ms, success, model, prompt_tokens, completion_tokens, commit_sha
    ) values (
      ${row.createdAt ?? new Date()}, ${row.universityId}, ${row.latencyMs}, ${row.success},
      ${row.model}, ${row.promptTokens ?? null}, ${row.completionTokens ?? null}, ${row.commitSha ?? null}
    );
  `;
}

export async function refreshDailyRollupFor(date: Date): Promise<void> {
  const sql = getSql();
  await ensureMetricsTables();
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  await sql`
    insert into assessment_metrics_daily (
      date, university_id, count, errors, p50_ms, p95_ms, total_prompt_tokens, total_completion_tokens
    )
    select
      date_trunc('day', created_at)::date as d,
      university_id,
      count(*)::int as count,
      sum(case when success then 0 else 1 end)::int as errors,
      coalesce(round((percentile_cont(0.5) within group (order by latency_ms))::numeric), 0)::int as p50_ms,
      coalesce(round((percentile_cont(0.95) within group (order by latency_ms))::numeric), 0)::int as p95_ms,
      coalesce(sum(prompt_tokens), 0)::bigint as total_prompt_tokens,
      coalesce(sum(completion_tokens), 0)::bigint as total_completion_tokens
    from assessment_metrics
    where created_at >= ${start} and created_at < ${end}
    group by d, university_id
    on conflict (date, university_id) do update set
      count = excluded.count,
      errors = excluded.errors,
      p50_ms = excluded.p50_ms,
      p95_ms = excluded.p95_ms,
      total_prompt_tokens = excluded.total_prompt_tokens,
      total_completion_tokens = excluded.total_completion_tokens;
  `;
}

export async function getAssessStatsDb(from?: Date, to?: Date): Promise<AssessStats> {
  const sql = getSql();
  await ensureMetricsTables();

  // If no range provided, default to last 24h
  const end = to ?? new Date();
  const start = from ?? new Date(end.getTime() - 24 * 60 * 60 * 1000);

  const rows = await sql<{
    count: number;
    errors: number;
    p50_ms: number | null;
    p95_ms: number | null;
    total_prompt_tokens: number | null;
    total_completion_tokens: number | null;
  }[]>`
    select
      count(*)::int as count,
      sum(case when success then 0 else 1 end)::int as errors,
      (percentile_cont(0.5) within group (order by latency_ms))::float as p50_ms,
      (percentile_cont(0.95) within group (order by latency_ms))::float as p95_ms,
      coalesce(sum(prompt_tokens), 0)::bigint as total_prompt_tokens,
      coalesce(sum(completion_tokens), 0)::bigint as total_completion_tokens
    from assessment_metrics
    where created_at >= ${start} and created_at <= ${end}
  `;

  const r = rows[0];
  if (!r) {
    return { count: 0, errors: 0, p50Ms: 0, p95Ms: 0, totalPromptTokens: 0, totalCompletionTokens: 0 };
  }
  return {
    count: Number(r.count ?? 0),
    errors: Number(r.errors ?? 0),
    p50Ms: Math.round((r.p50_ms ?? 0) as number),
    p95Ms: Math.round((r.p95_ms ?? 0) as number),
    totalPromptTokens: Number(r.total_prompt_tokens ?? 0),
    totalCompletionTokens: Number(r.total_completion_tokens ?? 0),
  };
}


