// api/reactions.ts — Pro reactions endpoints (jetonomy/v1). The POST is a single
// TOGGLE: one endpoint adds or removes; the server decides from current state and
// returns `action`. GET is public; POST needs auth (Basic header is always sent).

import { client, toApiError } from '@/api/client';
import type { ReactionData, ReactionSlug, ReactionToggleResponse } from '@/types/reaction';

/** GET /posts/{id}/reactions. */
export async function listPostReactions(postId: number): Promise<ReactionData> {
  try {
    const res = await client.get<ReactionData>(`/posts/${postId}/reactions`);
    return normalize(res.data);
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /posts/{id}/reactions — toggle `emoji` (a slug). */
export async function togglePostReaction(
  postId: number,
  emoji: ReactionSlug
): Promise<ReactionToggleResponse> {
  try {
    const res = await client.post<ReactionToggleResponse>(
      `/posts/${postId}/reactions`,
      { emoji }
    );
    return { ...res.data, ...normalize(res.data) };
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /replies/{id}/reactions. */
export async function listReplyReactions(replyId: number): Promise<ReactionData> {
  try {
    const res = await client.get<ReactionData>(`/replies/${replyId}/reactions`);
    return normalize(res.data);
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /replies/{id}/reactions — toggle `emoji` (a slug). */
export async function toggleReplyReaction(
  replyId: number,
  emoji: ReactionSlug
): Promise<ReactionToggleResponse> {
  try {
    const res = await client.post<ReactionToggleResponse>(
      `/replies/${replyId}/reactions`,
      { emoji }
    );
    return { ...res.data, ...normalize(res.data) };
  } catch (e) {
    throw toApiError(e);
  }
}

/** Defensive: ensure counts/user_reactions are always present + well-shaped. */
function normalize(data: Partial<ReactionData> | null | undefined): ReactionData {
  return {
    counts: data?.counts ?? {},
    user_reactions: Array.isArray(data?.user_reactions) ? data!.user_reactions : [],
  };
}
