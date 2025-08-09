import { getSql } from './db';

export type AssessmentRecord = {
  createdAt?: Date;
  universityId: string;
  answersJson: unknown;
  resultJson: unknown | null;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number | null;
  success: boolean;
  // optional pseudonymous fields packed into JSON later if present
  // These are not columns; they will be embedded inside result_json for now
  // to avoid schema churn per rules.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  email_hash?: string | null;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  student_id_hash?: string | null;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  email_domain?: string | null;
};

/**
 * Persist a single assessment attempt.
 * Creates the table on first use to avoid a separate migration step.
 */
export async function saveAssessmentRecord(record: AssessmentRecord): Promise<void> {
  const sql = getSql();
  // Minimal schema; JSONB columns for inputs/outputs
  await sql`
    create table if not exists assessments (
      id bigserial primary key,
      created_at timestamptz not null default now(),
      university_id text not null,
      answers_json jsonb not null,
      result_json jsonb,
      model text not null,
      prompt_tokens integer,
      completion_tokens integer,
      latency_ms integer,
      success boolean not null default false
    );
  `;

  const answersParam = JSON.stringify(record.answersJson);
  // Attach optional pseudonymous identifiers into result payload under _meta
  const withMeta = {
    ...(record.resultJson as Record<string, unknown> | null),
    _meta: {
      email_hash: (record as any).email_hash ?? null,
      student_id_hash: (record as any).student_id_hash ?? null,
      email_domain: (record as any).email_domain ?? null,
    },
  };
  const resultParam = record.resultJson ? JSON.stringify(withMeta) : null;
  await sql`
    insert into assessments (
      created_at, university_id, answers_json, result_json,
      model, prompt_tokens, completion_tokens, latency_ms, success
    ) values (
      ${record.createdAt ?? new Date()}, ${record.universityId}, ${answersParam}::jsonb,
      ${resultParam}::jsonb,
      ${record.model}, ${record.promptTokens}, ${record.completionTokens}, ${record.latencyMs}, ${record.success}
    );
  `;
}


