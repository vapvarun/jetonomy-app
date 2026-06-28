// hooks/useSpaces.ts — React Query hooks for spaces, members, categories,
// join-requests, invites, and all space mutations.
//
// Space-feed posts reuse Content's `useSpacePosts` (hooks/usePosts.ts, key
// ['posts', spaceId, sort]) — re-exported here so this domain's screens have a
// single import surface without duplicating the infinite-list logic.

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  approveJoinRequest,
  createSpace,
  deleteSpace,
  denyJoinRequest,
  generateInvite,
  getJoinRequests,
  getMembers,
  getPrivilegedMembers,
  getSpace,
  joinSpace,
  leaveSpace,
  listSpaces,
  updateMemberRole,
  updateSpace,
  useInviteToken,
  type ListSpacesQuery,
} from '@/api/spaces';
import { listCategories } from '@/api/categories';
import { useCurrentUser } from '@/stores/authStore';
import { dedupeBy } from '@/utils/dedupe';
import type { ListEnvelope } from '@/types/api';
import type { CategoryTreeNode } from '@/types/category';
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
  UseInviteResult,
} from '@/types/space';

export { useSpacePosts } from '@/hooks/usePosts';

const PAGE_LIMIT = 20;

// ---- Queries ----

/** GET /spaces — infinite (cursor via meta.cursor_next, offset fallback). */
export function useSpaceList(params: Omit<ListSpacesQuery, 'after' | 'offset'> = {}) {
  const query = useInfiniteQuery<ListEnvelope<Space>, Error>({
    queryKey: ['spaces', params],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      listSpaces({ ...params, after: pageParam as number | undefined, limit: PAGE_LIMIT }),
    getNextPageParam: (last) =>
      last.meta.has_more ? last.meta.cursor_next ?? undefined : undefined,
  });
  // Dedupe by id — a space created/reordered between page fetches can land on two
  // pages (10k+ spaces makes this likely), which would collide FlatList keys.
  const spaces: Space[] = dedupeBy(
    query.data?.pages.flatMap((p) => p.data) ?? [],
    (s) => s.id
  );
  return { ...query, spaces };
}

/** GET /spaces/{id}. */
export function useSpace(id: number | null) {
  return useQuery<Space, Error>({
    queryKey: ['space', id],
    enabled: id != null,
    queryFn: () => getSpace(id as number),
    staleTime: 15_000,
  });
}

/** GET /spaces/{id}/members — infinite. */
export function useSpaceMembers(id: number | null) {
  const query = useInfiniteQuery<ListEnvelope<SpaceMember>, Error>({
    queryKey: ['space-members', id],
    enabled: id != null,
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      getMembers(id as number, { after: pageParam as number | undefined, limit: PAGE_LIMIT }),
    getNextPageParam: (last) =>
      last.meta.has_more ? last.meta.cursor_next ?? undefined : undefined,
  });
  // Dedupe by user_id — the member-list key. Joins/leaves between page fetches
  // can otherwise surface the same member on two pages.
  const members: SpaceMember[] = dedupeBy(
    query.data?.pages.flatMap((p) => p.data) ?? [],
    (m) => m.user_id
  );
  return { ...query, members };
}

/** GET /spaces/{id}/privileged-members (bare array). */
export function useSpacePrivilegedMembers(id: number | null, limit = 20) {
  return useQuery<PrivilegedMember[], Error>({
    queryKey: ['space-privileged', id],
    enabled: id != null,
    queryFn: () => getPrivilegedMembers(id as number, limit),
    staleTime: 30_000,
  });
}

/** GET /categories — unpaginated tree; cache hard. */
export function useCategories() {
  return useQuery<ListEnvelope<CategoryTreeNode>, Error>({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });
}

/** GET /spaces/{id}/join-requests — privileged viewers only. */
export function useJoinRequests(id: number | null, enabled = true) {
  return useQuery<JoinRequestEnvelope, Error>({
    queryKey: ['join-requests', id],
    enabled: id != null && enabled,
    queryFn: () => getJoinRequests(id as number),
  });
}

// ---- Membership derivation (gotcha #1: Space carries no membership flag <1.6.0) ----

export interface MyMembership {
  isMember: boolean;
  role: SpaceRole | null;
  isPrivileged: boolean; // admin | moderator
  isAdmin: boolean;
  isResolving: boolean;
}

/**
 * Derive the current user's membership/role for a space. Prefers the 1.6.0
 * `is_member`/`viewer_role` enrichment on the Space object; falls back to
 * scanning the loaded members pages (so it is best-effort on large spaces and
 * a join attempt's 409 remains the real source of truth).
 */
export function useMyMembership(spaceId: number | null): MyMembership {
  const me = useCurrentUser();
  const spaceQ = useSpace(spaceId);
  const membersQ = useSpaceMembers(spaceId);

  const space = spaceQ.data;
  const myId = me?.user_id ?? null;

  // 1.6.0 enrichment path.
  if (space && typeof space.is_member === 'boolean') {
    const role = (space.viewer_role ?? null) as SpaceRole | null;
    return {
      isMember: space.is_member,
      role,
      isPrivileged: role === 'admin' || role === 'moderator',
      isAdmin: role === 'admin',
      isResolving: spaceQ.isLoading,
    };
  }

  // Fallback: scan loaded member rows.
  const row = myId != null ? membersQ.members.find((m) => m.user_id === myId) : undefined;
  const role = (row?.role ?? null) as SpaceRole | null;
  return {
    isMember: !!row,
    role,
    isPrivileged: role === 'admin' || role === 'moderator',
    isAdmin: role === 'admin',
    isResolving: spaceQ.isLoading || membersQ.isLoading,
  };
}

// ---- Mutations ----

/**
 * POST /spaces/{id}/members. Branch on 201 joined vs 202 pending at the caller
 * (do NOT optimistically flip to "joined" on pending). Invalidates space +
 * members so multi-actor state (already-member) reconciles from the server.
 */
export function useJoinSpace(id: number) {
  const qc = useQueryClient();
  return useMutation<JoinSpaceResult, Error, string | undefined>({
    mutationFn: (message) => joinSpace(id, message),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['space', id] });
      qc.invalidateQueries({ queryKey: ['space-members', id] });
      qc.invalidateQueries({ queryKey: ['spaces'] });
    },
  });
}

/** DELETE /spaces/{id}/members/{user_id} (leave self / kick). */
export function useLeaveSpace(id: number) {
  const qc = useQueryClient();
  return useMutation<LeaveResult, Error, number>({
    mutationFn: (userId) => leaveSpace(id, userId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['space', id] });
      qc.invalidateQueries({ queryKey: ['space-members', id] });
      qc.invalidateQueries({ queryKey: ['spaces'] });
    },
  });
}

/** PATCH /spaces/{id}/members/{user_id} — role change. */
export function useUpdateMemberRole(id: number) {
  const qc = useQueryClient();
  return useMutation<RoleUpdateResult, Error, { userId: number; role: SpaceRole }>({
    mutationFn: ({ userId, role }) => updateMemberRole(id, userId, role),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['space-members', id] });
      qc.invalidateQueries({ queryKey: ['space-privileged', id] });
    },
  });
}

export function useCreateSpace() {
  const qc = useQueryClient();
  return useMutation<Space, Error, Partial<Space> & { title: string }>({
    mutationFn: (body) => createSpace(body),
    onSuccess: (space) => {
      qc.setQueryData(['space', space.id], space);
      qc.invalidateQueries({ queryKey: ['spaces'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateSpace(id: number) {
  const qc = useQueryClient();
  return useMutation<Space, Error, Partial<Space>>({
    mutationFn: (patch) => updateSpace(id, patch),
    onSuccess: (space) => {
      qc.setQueryData(['space', id], space);
      qc.invalidateQueries({ queryKey: ['spaces'] });
    },
  });
}

export function useDeleteSpace(id: number) {
  const qc = useQueryClient();
  return useMutation<{ deleted: true; id: number }, Error, void>({
    mutationFn: () => deleteSpace(id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['space', id] });
      qc.invalidateQueries({ queryKey: ['spaces'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useGenerateInvite(id: number) {
  return useMutation<InviteResult, Error, { max_uses?: number; expires_at?: string } | void>({
    mutationFn: (body) => generateInvite(id, body ?? {}),
  });
}

/** GET /invite/{token} — accept flow. On success the caller routes to the space. */
export function useUseInvite() {
  const qc = useQueryClient();
  return useMutation<UseInviteResult, Error, string>({
    mutationFn: (token) => useInviteToken(token),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['space', res.space_id] });
      qc.invalidateQueries({ queryKey: ['space-members', res.space_id] });
      qc.invalidateQueries({ queryKey: ['spaces'] });
    },
  });
}

export function useApproveJoinRequest(id: number) {
  const qc = useQueryClient();
  return useMutation<JoinRequestActionResult, Error, number>({
    mutationFn: (requestId) => approveJoinRequest(id, requestId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['join-requests', id] });
      qc.invalidateQueries({ queryKey: ['space-members', id] });
      qc.invalidateQueries({ queryKey: ['space', id] });
    },
  });
}

export function useDenyJoinRequest(id: number) {
  const qc = useQueryClient();
  return useMutation<JoinRequestActionResult, Error, number>({
    mutationFn: (requestId) => denyJoinRequest(id, requestId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['join-requests', id] });
    },
  });
}
