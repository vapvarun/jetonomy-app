// api/users.ts — user/profile data access (free). One typed fn per endpoint.
// All paths relative to the jetonomy/v1 baseURL configured by foundation `client`.
//
// getMe / updateMe live in foundation api/auth.ts already; re-export (getMe) and
// wrap (updateMe with the narrower UpdateMeInput) so there is ONE implementation.

import { client, toApiError } from '@/api/client';
import { getMe, updateMe as updateMeRaw } from '@/api/auth';
import type { ListEnvelope } from '@/types/api';
import type { Post } from '@/types/post';
import type { Me, PublicUser, UserSuggestion } from '@/types/user';

export { getMe };

/** Editable subset of the profile (foundation owns `Me`; this is the PATCH body). */
export interface UpdateMeInput {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  settings?: Record<string, unknown>;
  email_opt_out?: boolean;
}

export interface UserPostsQuery {
  limit?: number;
  offset?: number;
  after?: number;
}

/** PATCH /users/me — partial profile update; returns updated Me. */
export async function updateMe(body: UpdateMeInput): Promise<Me> {
  return updateMeRaw(body as Partial<Me>);
}

/** GET /users/{id} — public profile (no email/settings). */
export async function getUser(id: number): Promise<PublicUser> {
  try {
    const res = await client.get<PublicUser>(`/users/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /users/by-login/{login} — handle-routed public profile. */
export async function getUserByLogin(login: string): Promise<PublicUser> {
  try {
    const res = await client.get<PublicUser>(
      `/users/by-login/${encodeURIComponent(login)}`
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /users/{id}/posts — paginated; returns Content (02) Post rows. */
export async function getUserPosts(
  id: number,
  params: UserPostsQuery = {}
): Promise<ListEnvelope<Post>> {
  try {
    const res = await client.get<ListEnvelope<Post>>(`/users/${id}/posts`, {
      params,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/**
 * GET /users/suggest — mention typeahead (q ≥ 2 chars else []). Lives here but
 * its only consumer is the Content (02) mention composer; exported for it.
 */
export async function suggestUsers(
  q: string,
  spaceId?: number
): Promise<UserSuggestion[]> {
  if (!q || q.trim().length < 2) return [];
  try {
    const res = await client.get<UserSuggestion[]>('/users/suggest', {
      params: { q, space_id: spaceId },
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    throw toApiError(e);
  }
}
