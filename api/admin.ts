// api/admin.ts — free admin maintenance (recount + bulk trust-level).

import { client, toApiError } from '@/api/client';
import type {
  RecountRequest,
  RecountResult,
  TrustLevelBody,
  TrustLevelResult,
} from '@/types/admin';

/** POST /admin/recount — rebuild denormalized counters (long op). */
export async function recount(
  body: RecountRequest = {}
): Promise<RecountResult> {
  try {
    const res = await client.post<RecountResult>('/admin/recount', body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /admin/users/trust-level — bulk-set trust levels. */
export async function setTrustLevel(
  body: TrustLevelBody
): Promise<TrustLevelResult> {
  try {
    const res = await client.post<TrustLevelResult>(
      '/admin/users/trust-level',
      body
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
