// api/search.ts — full-text search. Two return shapes (branch on `type`):
//   typed (post|reply|space|tag) → ListEnvelope<row>
//   all                          → { data:{posts,spaces,tags}, meta:{total} }
// Page size is fixed server-side (20 rows; tags 10); no limit/offset honored, so
// there is NO infinite scroll — a single ranked page.

import { client, toApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type {
  SearchAllResponse,
  SearchParams,
  SearchPostRow,
  SearchSpaceRow,
  SearchTagRow,
} from '@/types/search';

export type SearchRow = SearchPostRow | SearchSpaceRow | SearchTagRow;

/** Overloads: combined `all` mode vs typed mode. */
export async function search(
  params: SearchParams & { type: 'all' }
): Promise<SearchAllResponse>;
export async function search(
  params: SearchParams & { type?: 'post' | 'reply' | 'space' | 'tag' }
): Promise<ListEnvelope<SearchRow>>;
export async function search(
  params: SearchParams
): Promise<SearchAllResponse | ListEnvelope<SearchRow>> {
  try {
    const res = await client.get<SearchAllResponse | ListEnvelope<SearchRow>>(
      '/search',
      { params }
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
