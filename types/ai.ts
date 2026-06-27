// types/ai.ts — AI usage dashboard shapes (Pro, read-only).

/** A single AI usage record. */
export interface AiUsageRow {
  id: number;
  feature: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  created_at: string;
}

/** Aggregated AI usage summary. */
export interface AiUsageSummary {
  total_tokens: number;
  total_cost: number;
  by_feature?: Array<{ feature: string; tokens: number; cost: number }>;
  by_model?: Array<{ model: string; tokens: number; cost: number }>;
  range?: { start: string; end: string };
}

/** Filters for GET /ai/usage. */
export interface AiUsageQuery {
  start?: string;
  end?: string;
  feature?: string;
  model?: string;
  page?: number;
  per_page?: number;
}
