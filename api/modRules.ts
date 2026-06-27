// api/modRules.ts — advanced auto-moderation rules CRUD (Pro).

import { client, toApiError } from '@/api/client';
import type {
  CreateModRuleBody,
  ModRule,
  ModRuleStats,
  UpdateModRuleBody,
} from '@/types/modRules';

/** GET /moderation/rules. */
export async function listRules(): Promise<ModRule[]> {
  try {
    const res = await client.get<ModRule[] | { data: ModRule[] }>(
      '/moderation/rules'
    );
    const body = res.data;
    return Array.isArray(body) ? body : body.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /moderation/rules. */
export async function createRule(body: CreateModRuleBody): Promise<ModRule> {
  try {
    const res = await client.post<ModRule>('/moderation/rules', body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** PATCH /moderation/rules/{id}. */
export async function updateRule(
  id: number,
  body: UpdateModRuleBody
): Promise<ModRule> {
  try {
    const res = await client.patch<ModRule>(`/moderation/rules/${id}`, body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE /moderation/rules/{id}. */
export async function deleteRule(id: number): Promise<{ deleted: true }> {
  try {
    const res = await client.delete<{ deleted: true }>(`/moderation/rules/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /moderation/rules/{id}/stats. */
export async function getRuleStats(id: number): Promise<ModRuleStats> {
  try {
    const res = await client.get<ModRuleStats>(`/moderation/rules/${id}/stats`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
