// api/updates.ts — activity-log deltas. scope='post' is public-readable and
// returns number[] of new reply ids (drives the "N new replies" banner);
// global/space require auth and return ActivityRow[].

import { client, toApiError } from '@/api/client';
import type { UpdateScope, UpdatesResponse } from '@/types/update';

export interface UpdatesQuery {
  /** ISO8601 or MySQL datetime. */
  since: string;
  scope?: UpdateScope;
  /** Required for space/post scope. */
  id?: number;
}

/** GET /updates — server sets Cache-Control: no-cache; client must not cache. */
export async function getUpdates(q: UpdatesQuery): Promise<UpdatesResponse> {
  try {
    const res = await client.get<UpdatesResponse>('/updates', {
      params: q,
      headers: { 'Cache-Control': 'no-cache' },
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
