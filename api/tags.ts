// api/tags.ts — global tag list. (`/space-tags` was removed in 1.5.0.)

import { client, toApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type { Tag } from '@/types/tag';

export interface ListTagsQuery {
  limit?: number; // ≤100, server default 30
  sort?: 'popular' | 'alphabetical';
}

/** GET /tags. */
export async function listTags(q: ListTagsQuery = {}): Promise<ListEnvelope<Tag>> {
  try {
    const res = await client.get<ListEnvelope<Tag>>('/tags', { params: q });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
