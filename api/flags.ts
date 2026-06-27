// api/flags.ts — member flag action (admin flag *management* is api/moderation.ts).

import { client, toApiError } from '@/api/client';
import type {
  CreateFlagBody,
  FlagPostBody,
  FlagResult,
} from '@/types/moderation';

/**
 * POST /flags — generic flag (works for posts AND replies). Prefer this; it
 * carries the object_type so replies are flaggable. 409 (already flagged) is
 * mapped by callers to "success/sticky", not an error toast.
 */
export async function createFlag(body: CreateFlagBody): Promise<FlagResult> {
  try {
    const res = await client.post<FlagResult>('/flags', body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/**
 * POST /posts/{id}/flags — post-scoped alias. Use only when just a post id is
 * in hand; otherwise prefer createFlag.
 */
export async function flagPost(
  postId: number,
  body: FlagPostBody
): Promise<FlagResult> {
  try {
    const res = await client.post<FlagResult>(`/posts/${postId}/flags`, body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
