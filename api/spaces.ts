// api/spaces.ts — typed wrappers for every space / member / invite endpoint.
// One typed function per endpoint. No React here. All paths relative to the
// jetonomy/v1 baseURL configured by the foundation `client`.

import { client, toApiError } from '@/api/client';
import { listSpacePosts as listSpacePostsContent } from '@/api/posts';
import type { ListEnvelope } from '@/types/api';
import type { Post } from '@/types/post';
import type {
  InviteResult,
  JoinRequestActionResult,
  JoinRequestEnvelope,
  JoinSpaceResult,
  LeaveResult,
  PrivilegedMember,
  RoleUpdateResult,
  Space,
  SpaceMember,
  SpaceRole,
  SpaceType,
  SpaceVisibility,
  UseInviteResult,
} from '@/types/space';

export interface ListSpacesQuery {
  category_id?: number;
  type?: SpaceType | string;
  visibility?: SpaceVisibility;
  /** member-of AND can-post spaces only (compose space picker). */
  postable_by_me?: boolean;
  limit?: number;
  after?: number;
  offset?: number;
}

export type SpacePostSort =
  | 'latest'
  | 'popular'
  | 'oldest'
  | 'newest'
  | 'unanswered';

export interface SpacePostsQuery {
  sort?: SpacePostSort;
  limit?: number;
  after?: number;
  offset?: number;
}

/** GET /spaces → ListEnvelope<Space> (+ X-WP-TotalPages header). */
export async function listSpaces(
  params: ListSpacesQuery = {}
): Promise<ListEnvelope<Space>> {
  try {
    const res = await client.get<ListEnvelope<Space>>('/spaces', { params });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /spaces/{id} → Space (bare). 403 for private/hidden non-members. */
export async function getSpace(id: number): Promise<Space> {
  try {
    const res = await client.get<Space>(`/spaces/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /spaces → Space (201). Capability-gated. */
export async function createSpace(
  body: Partial<Space> & { title: string }
): Promise<Space> {
  try {
    const res = await client.post<Space>('/spaces', body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** PATCH /spaces/{id} → Space. `settings` is merged server-side. Space-admin. */
export async function updateSpace(
  id: number,
  patch: Partial<Space>
): Promise<Space> {
  try {
    const res = await client.patch<Space>(`/spaces/${id}`, patch);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE /spaces/{id} → {deleted, id}. Space-admin. */
export async function deleteSpace(
  id: number
): Promise<{ deleted: true; id: number }> {
  try {
    const res = await client.delete<{ deleted: true; id: number }>(
      `/spaces/${id}`
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /spaces/{id}/members → ListEnvelope<SpaceMember>. 403 private/hidden. */
export async function getMembers(
  id: number,
  params: { limit?: number; after?: number; offset?: number } = {}
): Promise<ListEnvelope<SpaceMember>> {
  try {
    const res = await client.get<ListEnvelope<SpaceMember>>(
      `/spaces/${id}/members`,
      { params }
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /spaces/{id}/privileged-members → PrivilegedMember[] (⚠ bare array). */
export async function getPrivilegedMembers(
  id: number,
  limit = 20
): Promise<PrivilegedMember[]> {
  try {
    const res = await client.get<PrivilegedMember[]>(
      `/spaces/${id}/privileged-members`,
      { params: { limit } }
    );
    return Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    throw toApiError(e);
  }
}

/**
 * POST /spaces/{id}/members → JoinResult (201) | PendingResult (202).
 * Handle 403 invite-only, 409 already-member at the caller.
 */
export async function joinSpace(
  id: number,
  message?: string
): Promise<JoinSpaceResult> {
  try {
    const res = await client.post<JoinSpaceResult>(
      `/spaces/${id}/members`,
      message ? { message } : {}
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE /spaces/{id}/members/{user_id} → LeaveResult. (self = leave; admin = kick.) */
export async function leaveSpace(
  id: number,
  userId: number
): Promise<LeaveResult> {
  try {
    const res = await client.delete<LeaveResult>(
      `/spaces/${id}/members/${userId}`
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** PATCH /spaces/{id}/members/{user_id} → RoleUpdateResult. 400 self-demote/last-admin. */
export async function updateMemberRole(
  id: number,
  userId: number,
  role: SpaceRole
): Promise<RoleUpdateResult> {
  try {
    const res = await client.patch<RoleUpdateResult>(
      `/spaces/${id}/members/${userId}`,
      { role }
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /spaces/{id}/join-requests → {data, meta.total}. Privileged-only. */
export async function getJoinRequests(
  id: number
): Promise<JoinRequestEnvelope> {
  try {
    const res = await client.get<JoinRequestEnvelope>(
      `/spaces/${id}/join-requests`
    );
    // Defensive: hand-rolled envelope, ensure shape.
    return {
      data: Array.isArray(res.data?.data) ? res.data.data : [],
      meta: { total: res.data?.meta?.total ?? 0 },
    };
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /spaces/{id}/join-requests/{request_id}/approve. Privileged. */
export async function approveJoinRequest(
  id: number,
  requestId: number
): Promise<JoinRequestActionResult> {
  try {
    const res = await client.post<JoinRequestActionResult>(
      `/spaces/${id}/join-requests/${requestId}/approve`
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /spaces/{id}/join-requests/{request_id}/deny. Privileged. */
export async function denyJoinRequest(
  id: number,
  requestId: number
): Promise<JoinRequestActionResult> {
  try {
    const res = await client.post<JoinRequestActionResult>(
      `/spaces/${id}/join-requests/${requestId}/deny`
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /spaces/{id}/invite → InviteResult (201). Space-admin. */
export async function generateInvite(
  id: number,
  body: { max_uses?: number; expires_at?: string } = {}
): Promise<InviteResult> {
  try {
    const res = await client.post<InviteResult>(`/spaces/${id}/invite`, body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /invite/{token} → UseInviteResult. Handle 401 jetonomy_login_required. */
export async function useInviteToken(token: string): Promise<UseInviteResult> {
  try {
    const res = await client.get<UseInviteResult>(
      `/invite/${encodeURIComponent(token)}`
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/**
 * GET /spaces/{space_id}/posts → ListEnvelope<Post> (Content's `Post`).
 * Reuses Content's identical wrapper (`api/posts.listSpacePosts`) — zero
 * duplicated request logic; only the param surface is named for this domain.
 */
export async function getSpacePosts(
  spaceId: number,
  params: SpacePostsQuery = {}
): Promise<ListEnvelope<Post>> {
  return listSpacePostsContent(spaceId, params);
}
