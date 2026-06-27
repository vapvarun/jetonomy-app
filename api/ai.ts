// api/ai.ts — AI usage dashboard (Pro, read-only, rest_admin_check).

import { client, toApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type { AiUsageQuery, AiUsageRow, AiUsageSummary } from '@/types/ai';

/** GET /ai/usage — paginated usage rows. */
export async function usage(
  q: AiUsageQuery = {}
): Promise<ListEnvelope<AiUsageRow>> {
  try {
    const res = await client.get<ListEnvelope<AiUsageRow>>('/ai/usage', {
      params: q,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /ai/usage/summary — aggregated totals. */
export async function usageSummary(
  q: Pick<AiUsageQuery, 'start' | 'end'> = {}
): Promise<AiUsageSummary> {
  try {
    const res = await client.get<AiUsageSummary>('/ai/usage/summary', {
      params: q,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
