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

  await sql`
    insert into assessments (
      created_at, university_id, answers_json, result_json,
      model, prompt_tokens, completion_tokens, latency_ms, success
    ) values (
      ${record.createdAt ?? new Date()}, ${record.universityId}, ${sql.json(record.answersJson)},
      ${record.resultJson ? sql.json(record.resultJson) : null},
      ${record.model}, ${record.promptTokens}, ${record.completionTokens}, ${record.latencyMs}, ${record.success}
    );
  `;
}


