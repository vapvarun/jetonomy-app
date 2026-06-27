// hooks/usePosts.ts — React Query hooks for posts, feed, drafts, and mutations.

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  closePost,
  createPost,
  deletePost,
  getFeed,
  getPost,
  listDrafts,
  listSpacePosts,
  mergePost,
  movePost,
  pinPost,
  setIdeaStatus,
  updatePost,
  type CreatePostBody,
  type FeedResult,
  type PostSort,
  type UpdatePostBody,
} from '@/api/posts';
import type { IdeaStatus, Post } from '@/types/post';
import type { ListEnvelope } from '@/types/api';

const PAGE_LIMIT = 20;

/** Home feed (cross-space, with space-list fallback baked into getFeed). */
export function useFeed(sort: PostSort) {
  const query = useInfiniteQuery<FeedResult, Error>({
    queryKey: ['feed', sort],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      getFeed({ after: pageParam as number | undefined, sort, limit: PAGE_LIMIT }),
    getNextPageParam: (last) =>
      last.meta.has_more ? last.meta.cursor_next ?? undefined : undefined,
  });
  const posts: Post[] = query.data?.pages.flatMap((p) => p.data) ?? [];
  const fallbackSpaceId =
    query.data?.pages[0]?.fallbackSpaceId ?? null;
  return { ...query, posts, fallbackSpaceId };
}

/** Space-scoped post list (infinite). */
export function useSpacePosts(spaceId: number | null, sort: PostSort) {
  const query = useInfiniteQuery<ListEnvelope<Post>, Error>({
    queryKey: ['posts', spaceId, sort],
    enabled: spaceId != null,
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      listSpacePosts(spaceId as number, {
        after: pageParam as number | undefined,
        sort,
        limit: PAGE_LIMIT,
      }),
    getNextPageParam: (last) =>
      last.meta.has_more ? last.meta.cursor_next ?? undefined : undefined,
  });
  const posts: Post[] = query.data?.pages.flatMap((p) => p.data) ?? [];
  return { ...query, posts };
}

/** Single post detail (view_count side-effect ⇒ fine to refetch on focus). */
export function usePost(id: number) {
  return useQuery<Post, Error>({
    queryKey: ['post', id],
    queryFn: () => getPost(id),
    staleTime: 10_000,
  });
}

/** Draft list. */
export function useDrafts() {
  return useQuery<Post[], Error>({
    queryKey: ['drafts'],
    queryFn: () => listDrafts().then((r) => r.data),
  });
}

// ---- Mutations ----

export function useCreatePost(spaceId: number) {
  const qc = useQueryClient();
  return useMutation<Post, Error, CreatePostBody>({
    mutationFn: (body) => createPost(spaceId, body),
    onSuccess: (post, body) => {
      qc.invalidateQueries({ queryKey: ['posts', spaceId] });
      qc.invalidateQueries({ queryKey: ['space', spaceId] });
      qc.invalidateQueries({ queryKey: ['feed'] });
      if (body.status === 'draft') qc.invalidateQueries({ queryKey: ['drafts'] });
      qc.setQueryData(['post', post.id], post);
    },
  });
}

export function useUpdatePost(id: number) {
  const qc = useQueryClient();
  return useMutation<Post, Error, UpdatePostBody>({
    mutationFn: (body) => updatePost(id, body),
    onSuccess: (post) => {
      qc.setQueryData(['post', id], post);
      qc.invalidateQueries({ queryKey: ['posts', post.space_id] });
      qc.invalidateQueries({ queryKey: ['drafts'] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

/** Publish a draft (status:'publish'). */
export function usePublishDraft(id: number) {
  const qc = useQueryClient();
  return useMutation<Post, Error, void>({
    mutationFn: () => updatePost(id, { status: 'publish' }),
    onSuccess: (post) => {
      qc.setQueryData(['post', id], post);
      qc.invalidateQueries({ queryKey: ['drafts'] });
      qc.invalidateQueries({ queryKey: ['posts', post.space_id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useDeletePost(id: number, spaceId?: number) {
  const qc = useQueryClient();
  return useMutation<{ deleted: true; id: number }, Error, void>({
    mutationFn: () => deletePost(id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['post', id] });
      if (spaceId != null) qc.invalidateQueries({ queryKey: ['posts', spaceId] });
      qc.invalidateQueries({ queryKey: ['drafts'] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

/**
 * Optimistic mod toggle/patch. Patches the cached ['post', id] object, then
 * reconciles with the returned Post (source of truth — handles multi-actor
 * "already pinned/closed"). Rolls back on error.
 */
function useOptimisticPostPatch<TVars>(
  id: number,
  mutationFn: (vars: TVars) => Promise<Post>,
  patch: (prev: Post, vars: TVars) => Post
) {
  const qc = useQueryClient();
  return useMutation<Post, Error, TVars, { prev?: Post }>({
    mutationFn,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['post', id] });
      const prev = qc.getQueryData<Post>(['post', id]);
      if (prev) qc.setQueryData(['post', id], patch(prev, vars));
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['post', id], ctx.prev);
    },
    onSuccess: (post) => {
      qc.setQueryData(['post', id], post);
      qc.invalidateQueries({ queryKey: ['posts', post.space_id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useClosePost(id: number) {
  return useOptimisticPostPatch<void>(
    id,
    () => closePost(id),
    (prev) => ({ ...prev, is_closed: !prev.is_closed })
  );
}

export function usePinPost(id: number) {
  return useOptimisticPostPatch<void>(
    id,
    () => pinPost(id),
    (prev) => ({ ...prev, is_sticky: !prev.is_sticky })
  );
}

export function useMovePost(id: number) {
  return useOptimisticPostPatch<number>(
    id,
    (targetSpaceId) => movePost(id, targetSpaceId),
    (prev, targetSpaceId) => ({ ...prev, space_id: targetSpaceId })
  );
}

export function useMergePost(id: number) {
  const qc = useQueryClient();
  return useMutation<Post, Error, number>({
    mutationFn: (targetPostId) => mergePost(id, targetPostId),
    onSuccess: (target) => {
      qc.removeQueries({ queryKey: ['post', id] });
      qc.setQueryData(['post', target.id], target);
      qc.invalidateQueries({ queryKey: ['posts', target.space_id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useSetIdeaStatus(id: number) {
  return useOptimisticPostPatch<IdeaStatus>(
    id,
    (status) => setIdeaStatus(id, status),
    (prev, status) => ({ ...prev, idea_status: status })
  );
}
