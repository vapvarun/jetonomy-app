// api/replies.ts — replies CRUD + accept + split.

import { client, toApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type { Reply, SplitResult } from '@/types/reply';

export type ReplySort = 'oldest' | 'newest' | 'best';

export interface ListRepliesQuery {
  limit?: number;
  after?: number;
  before?: number;
  offset?: number;
  sort?: ReplySort;
}

export interface CreateReplyBody {
  content: string;
  parent_id?: number;
  published_at?: string;
  captcha_token?: string;
}

export interface UpdateReplyBody {
  content?: string;
  published_at?: string;
}

/** GET /posts/{postId}/replies — cursor-paginated. */
export async function listReplies(
  postId: number,
  q: ListRepliesQuery = {}
): Promise<ListEnvelope<Reply>> {
  try {
    const res = await client.get<ListEnvelope<Reply>>(`/posts/${postId}/replies`, {
      params: q,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /posts/{postId}/replies — 403 if post closed / space locked. */
export async function createReply(
  postId: number,
  body: CreateReplyBody
): Promise<Reply> {
  try {
    const res = await client.post<Reply>(`/posts/${postId}/replies`, body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** PATCH /replies/{id}. */
export async function updateReply(id: number, body: UpdateReplyBody): Promise<Reply> {
  try {
    const res = await client.patch<Reply>(`/replies/${id}`, body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE /replies/{id} — soft trash. */
export async function deleteReply(id: number): Promise<{ deleted: true; id: number }> {
  try {
    const res = await client.delete<{ deleted: true; id: number }>(`/replies/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /replies/{id}/accept — Q&A spaces only (400 otherwise). */
export async function acceptReply(id: number): Promise<Reply> {
  try {
    const res = await client.post<Reply>(`/replies/${id}/accept`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE /replies/{id}/accept — un-accept. */
export async function unacceptReply(id: number): Promise<Reply> {
  try {
    const res = await client.delete<Reply>(`/replies/${id}/accept`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /replies/{id}/split — promotes a reply into a new topic (201). */
export async function splitReply(
  id: number,
  body: { title: string; space_id?: number }
): Promise<SplitResult> {
  try {
    const res = await client.post<SplitResult>(`/replies/${id}/split`, body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
