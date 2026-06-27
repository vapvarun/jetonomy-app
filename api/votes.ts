// api/votes.ts — up/down votes on posts + replies.
// Server rules: self-downvote → 400; 1/-1 only; re-POSTing the same value
// toggles off. Response carries the authoritative new score, NOT the user's
// current value — the client tracks UserVoteState locally (see hooks/useVotes).

import { client, toApiError } from '@/api/client';
import type { VoteResponse } from '@/types/vote';

export type VoteValue = 1 | -1;

/** POST /posts/{id}/vote. */
export async function votePost(id: number, value: VoteValue): Promise<VoteResponse> {
  try {
    const res = await client.post<VoteResponse>(`/posts/${id}/vote`, { value });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE /posts/{id}/vote — clears the viewer's vote. */
export async function unvotePost(id: number): Promise<VoteResponse> {
  try {
    const res = await client.delete<VoteResponse>(`/posts/${id}/vote`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /replies/{id}/vote. */
export async function voteReply(id: number, value: VoteValue): Promise<VoteResponse> {
  try {
    const res = await client.post<VoteResponse>(`/replies/${id}/vote`, { value });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE /replies/{id}/vote — clears the viewer's vote. */
export async function unvoteReply(id: number): Promise<VoteResponse> {
  try {
    const res = await client.delete<VoteResponse>(`/replies/${id}/vote`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
