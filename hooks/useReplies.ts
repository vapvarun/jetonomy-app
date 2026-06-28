// hooks/useReplies.ts — replies list (infinite) + optimistic create/edit/delete/accept/split.

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import {
  acceptReply,
  createReply,
  deleteReply,
  listReplies,
  splitReply,
  unacceptReply,
  updateReply,
  type CreateReplyBody,
  type ReplySort,
  type UpdateReplyBody,
} from '@/api/replies';
import { useCurrentUser } from '@/stores/authStore';
import { dedupeBy } from '@/utils/dedupe';
import type { ListEnvelope } from '@/types/api';
import type { Post } from '@/types/post';
import type { Reply, SplitResult } from '@/types/reply';

const PAGE_LIMIT = 20;

type RepliesData = InfiniteData<ListEnvelope<Reply>>;

export function useReplies(postId: number, sort: ReplySort) {
  const query = useInfiniteQuery<ListEnvelope<Reply>, Error>({
    queryKey: ['replies', postId, sort],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      listReplies(postId, {
        after: pageParam as number | undefined,
        sort,
        limit: PAGE_LIMIT,
      }),
    getNextPageParam: (last) =>
      last.meta.has_more ? last.meta.cursor_next ?? undefined : undefined,
  });
  // A non-id sort (votes/recency) can shift a reply across a cursor boundary, and
  // optimistic create briefly coexists with the server row; dedupe by id so the
  // 200-400+ reply list never collides keys.
  const replies: Reply[] = dedupeBy(
    query.data?.pages.flatMap((p) => p.data) ?? [],
    (r) => r.id
  );
  return { ...query, replies };
}

/** Mutate every cached replies page (across sorts) for a post. */
function patchReplyPages(
  data: RepliesData | undefined,
  fn: (replies: Reply[]) => Reply[]
): RepliesData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page, i) =>
      i === 0 ? { ...page, data: fn(page.data) } : page
    ),
  };
}

export function useCreateReply(postId: number, sort: ReplySort) {
  const qc = useQueryClient();
  const me = useCurrentUser();
  return useMutation<Reply, Error, CreateReplyBody, { tempId: number }>({
    mutationFn: (body) => createReply(postId, body),
    onMutate: async (body) => {
      const key = ['replies', postId, sort];
      await qc.cancelQueries({ queryKey: key });
      const tempId = -Date.now();
      const temp: Reply = {
        id: tempId,
        post_id: postId,
        parent_id: body.parent_id ?? null,
        author_id: me?.user_id ?? 0,
        content: body.content,
        content_plain: body.content,
        status: 'publish',
        is_accepted: false,
        vote_score: 0,
        edited_at: null,
        edited_by: null,
        created_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        author_name: me?.display_name ?? 'You',
        author_avatar: (me?.avatar_url as string) ?? '',
        author_login: (me?.user_login as string) ?? '',
        trust_level: me?.trust_level ?? 0,
        reputation: me?.reputation ?? 0,
        time_ago: 'now',
        profile_url: '',
        viewer_vote: 0,
      };
      qc.setQueryData<RepliesData>(key, (data: RepliesData | undefined) =>
        patchReplyPages(data, (replies) => [...replies, temp])
      );
      return { tempId };
    },
    onError: (_e, _body, ctx) => {
      if (!ctx) return;
      const key = ['replies', postId, sort];
      qc.setQueryData<RepliesData>(key, (data: RepliesData | undefined) =>
        patchReplyPages(data, (replies) =>
          replies.filter((r) => r.id !== ctx.tempId)
        )
      );
    },
    onSuccess: (reply, _body, ctx) => {
      const key = ['replies', postId, sort];
      qc.setQueryData<RepliesData>(key, (data: RepliesData | undefined) =>
        patchReplyPages(data, (replies) =>
          replies.map((r) => (r.id === ctx?.tempId ? reply : r))
        )
      );
      qc.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}

export function useUpdateReply(postId: number) {
  const qc = useQueryClient();
  return useMutation<Reply, Error, { id: number; body: UpdateReplyBody }>({
    mutationFn: ({ id, body }) => updateReply(id, body),
    onSuccess: (reply) => {
      qc.setQueriesData<RepliesData>(
        { queryKey: ['replies', postId] },
        (data: RepliesData | undefined) =>
          patchReplyPages(data, (replies) =>
            replies.map((r) => (r.id === reply.id ? reply : r))
          )
      );
    },
  });
}

export function useDeleteReply(postId: number) {
  const qc = useQueryClient();
  return useMutation<{ deleted: true; id: number }, Error, number>({
    mutationFn: (id) => deleteReply(id),
    onSuccess: (_res, id) => {
      qc.setQueriesData<RepliesData>(
        { queryKey: ['replies', postId] },
        (data: RepliesData | undefined) =>
          patchReplyPages(data, (replies) => replies.filter((r) => r.id !== id))
      );
      qc.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}

/** Accept/un-accept enforce the single-accepted invariant in cache. */
export function useAcceptReply(postId: number) {
  const qc = useQueryClient();
  return useMutation<Reply, Error, number>({
    mutationFn: (id) => acceptReply(id),
    onSuccess: (reply) => {
      qc.setQueriesData<RepliesData>(
        { queryKey: ['replies', postId] },
        (data: RepliesData | undefined) =>
          patchReplyPages(data, (replies) =>
            replies.map((r) => ({ ...r, is_accepted: r.id === reply.id }))
          )
      );
      qc.setQueryData<Post>(['post', postId], (prev: Post | undefined) =>
        prev
          ? { ...prev, is_resolved: true, accepted_reply_id: reply.id }
          : prev
      );
    },
  });
}

export function useUnacceptReply(postId: number) {
  const qc = useQueryClient();
  return useMutation<Reply, Error, number>({
    mutationFn: (id) => unacceptReply(id),
    onSuccess: (reply) => {
      qc.setQueriesData<RepliesData>(
        { queryKey: ['replies', postId] },
        (data: RepliesData | undefined) =>
          patchReplyPages(data, (replies) =>
            replies.map((r) =>
              r.id === reply.id ? { ...r, is_accepted: false } : r
            )
          )
      );
      qc.setQueryData<Post>(['post', postId], (prev: Post | undefined) =>
        prev ? { ...prev, is_resolved: false, accepted_reply_id: null } : prev
      );
    },
  });
}

export function useSplitReply(id: number) {
  return useMutation<SplitResult, Error, { title: string; space_id?: number }>({
    mutationFn: (body) => splitReply(id, body),
  });
}
