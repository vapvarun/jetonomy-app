// hooks/useBookmarks.ts — bookmarked posts list + optimistic toggle.

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { listBookmarks, toggleBookmark } from '@/api/bookmarks';
import { dedupeBy } from '@/utils/dedupe';
import type { ListEnvelope } from '@/types/api';
import type { BookmarkItem, BookmarkToggleResult } from '@/types/bookmark';
import type { Post } from '@/types/post';

const PAGE_LIMIT = 20;

/** GET /bookmarks — infinite list of lean post rows. */
export function useBookmarks() {
  const query = useInfiniteQuery<ListEnvelope<BookmarkItem>, Error>({
    queryKey: ['bookmarks'],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      listBookmarks({ after: pageParam as number | undefined, limit: PAGE_LIMIT }),
    getNextPageParam: (last) =>
      last.meta.has_more ? last.meta.cursor_next ?? undefined : undefined,
  });
  // Dedupe by id — a bookmark added/removed between page fetches can otherwise
  // repeat a row across a cursor boundary and collide FlatList keys.
  const bookmarks: BookmarkItem[] = dedupeBy(
    query.data?.pages.flatMap((p) => p.data) ?? [],
    (b) => b.id
  );
  return { ...query, bookmarks };
}

/**
 * Optimistic bookmark toggle. Flips `is_bookmarked` on any cached
 * ['post', id] immediately, reconciles with the server `{bookmarked}`, and
 * invalidates the ['bookmarks'] list on settle. Rolls back on error.
 *
 * `currentlyBookmarked` lets list rows (BookmarkItem has no flag) drive the
 * optimistic direction; detail screens can omit it (read from the cached Post).
 */
export function useToggleBookmark(postId: number, currentlyBookmarked?: boolean) {
  const qc = useQueryClient();
  return useMutation<
    BookmarkToggleResult,
    Error,
    void,
    { prevPost?: Post; prevFlag?: boolean }
  >({
    mutationFn: () => toggleBookmark(postId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['post', postId] });
      const prevPost = qc.getQueryData<Post>(['post', postId]);
      const prevFlag = prevPost?.is_bookmarked ?? currentlyBookmarked;
      if (prevPost) {
        qc.setQueryData<Post>(['post', postId], {
          ...prevPost,
          is_bookmarked: !(prevPost.is_bookmarked ?? currentlyBookmarked ?? false),
        });
      }
      return { prevPost, prevFlag };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prevPost) qc.setQueryData(['post', postId], ctx.prevPost);
    },
    onSuccess: (res) => {
      const post = qc.getQueryData<Post>(['post', postId]);
      if (post) {
        qc.setQueryData<Post>(['post', postId], { ...post, is_bookmarked: res.bookmarked });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}
