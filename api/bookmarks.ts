// api/bookmarks.ts — the member's bookmarked posts (lean projection).

import { client, toApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type { BookmarkItem, BookmarkToggleResult } from '@/types/bookmark';

export interface ListBookmarksQuery {
  limit?: number;
  after?: number;
  offset?: number;
}

/** GET /bookmarks → ListEnvelope<BookmarkItem> (lean post rows, NOT full Post). */
export async function listBookmarks(
  params: ListBookmarksQuery = {}
): Promise<ListEnvelope<BookmarkItem>> {
  try {
    const res = await client.get<ListEnvelope<BookmarkItem>>('/bookmarks', {
      params,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /bookmarks → {bookmarked} only (no count). Server toggles. */
export async function toggleBookmark(
  postId: number
): Promise<BookmarkToggleResult> {
  try {
    const res = await client.post<BookmarkToggleResult>('/bookmarks', {
      post_id: postId,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE /bookmarks/{post_id} → {deleted, post_id}. Explicit remove. */
export async function removeBookmark(
  postId: number
): Promise<{ deleted: true; post_id: number }> {
  try {
    const res = await client.delete<{ deleted: true; post_id: number }>(
      `/bookmarks/${postId}`
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
