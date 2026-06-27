// api/polls.ts — Pro polls endpoints (jetonomy/v1). Every poll payload is enveloped
// `{ data: Poll }`; these wrappers unwrap `.data`. GET on a post with no poll 404s
// with `jetonomy_not_found` → getPollForPost returns null (NOT an error).

import { client, toApiError } from '@/api/client';
import type { Poll, PollEnvelope, PollType } from '@/types/poll';

/** GET /posts/{post_id}/poll — 404 → null (no poll attached). */
export async function getPollForPost(postId: number): Promise<Poll | null> {
  try {
    const res = await client.get<PollEnvelope>(`/posts/${postId}/poll`);
    return res.data?.data ?? null;
  } catch (e) {
    const err = toApiError(e);
    if (err.status === 404) return null;
    throw err;
  }
}

/** POST /polls/{id}/vote — single (option_id) or multiple (option_ids). */
export async function vote(
  pollId: number,
  sel: { option_id?: number; option_ids?: number[] }
): Promise<Poll> {
  try {
    const res = await client.post<PollEnvelope>(`/polls/${pollId}/vote`, sel);
    return res.data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE /polls/{id}/vote — retract the caller's vote. */
export async function removeVote(pollId: number): Promise<Poll> {
  try {
    const res = await client.delete<PollEnvelope>(`/polls/${pollId}/vote`);
    return res.data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** PATCH /polls/{id} — close/reopen via closes_at (author menu only). */
export async function closePoll(pollId: number, closes_at: string): Promise<Poll> {
  try {
    const res = await client.patch<PollEnvelope>(`/polls/${pollId}`, { closes_at });
    return res.data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/**
 * POST /posts/{post_id}/poll — create a poll. Shipped so the Content compose flow
 * (domain 02) can attach poll authoring later; no UI consumes it in app v1.
 */
export async function createPoll(
  postId: number,
  body: {
    question: string;
    options: string[];
    type?: PollType;
    closes_at?: string;
  }
): Promise<Poll> {
  try {
    const res = await client.post<PollEnvelope>(`/posts/${postId}/poll`, body);
    return res.data.data;
  } catch (e) {
    throw toApiError(e);
  }
}
