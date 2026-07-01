// hooks/useNotifications.ts — React Query for the notification feed + unread badge.

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  bulk as bulkApi,
  dismiss as dismissApi,
  listNotifications,
  markAllRead as markAllReadApi,
  markRead as markReadApi,
  unreadCount,
} from '@/api/notifications';
import { toApiError } from '@/api/client';
import { dedupeBy } from '@/utils/dedupe';
import type { ListEnvelope } from '@/types/api';
import type {
  BulkAction,
  NotificationFilter,
  NotificationItem,
} from '@/types/notification';

const PAGE_LIMIT = 20;

type Page = ListEnvelope<NotificationItem>;

/** Infinite feed, offset-paged from `meta`. */
export function useNotifications(filter: NotificationFilter) {
  const query = useInfiniteQuery<Page, Error>({
    queryKey: ['notifications', filter],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listNotifications({
        filter,
        limit: PAGE_LIMIT,
        offset: pageParam as number,
      }),
    getNextPageParam: (last, pages) => {
      if (!last.meta.has_more) return undefined;
      const loaded = pages.reduce((n, p) => n + p.data.length, 0);
      return loaded;
    },
  });
  // Offset paging overlaps when new notifications arrive between fetches; dedupe
  // by id so the FlatList never sees a repeated key. Guard `pages` (not just
  // `data`) so a legacy/incompatible persisted shape degrades to an empty feed
  // instead of throwing on `.flatMap`.
  const items: NotificationItem[] = dedupeBy(
    query.data?.pages?.flatMap((p) => p.data) ?? [],
    (n) => n.id
  );
  return { ...query, items };
}

/**
 * Unread count — polls every 30s + refetches on app foreground. Feeds the tab
 * badge. Keyed `['notifications', 'unread-count']` (NOT `['notifications',
 * 'unread']`) so this scalar query never collides with the infinite feed query
 * for the `'unread'` filter, which would otherwise write a number where the feed
 * expects `{ pages }` and crash on `.flatMap`.
 */
export function useUnreadCount() {
  return useQuery<number, Error>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => unreadCount().then((r) => r.count),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['notifications'] });
}

/** Mark one read — optimistic is_read flip; 404 (already gone) treated as success. */
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation<NotificationItem | null, Error, number>({
    mutationFn: async (id) => {
      try {
        return await markReadApi(id);
      } catch (e) {
        if (toApiError(e).status === 404) return null;
        throw e;
      }
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Dismiss one — 404 treated as already-deleted success. */
export function useDismiss() {
  const qc = useQueryClient();
  return useMutation<{ deleted: true } | null, Error, number>({
    mutationFn: async (id) => {
      try {
        return await dismissApi(id);
      } catch (e) {
        if (toApiError(e).status === 404) return null;
        throw e;
      }
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation<{ updated: number }, Error, void>({
    mutationFn: () => markAllReadApi(),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useBulk() {
  const qc = useQueryClient();
  return useMutation<
    { updated?: number; deleted?: number },
    Error,
    { action: BulkAction; ids: number[] }
  >({
    mutationFn: (body) => bulkApi(body),
    onSuccess: () => invalidateAll(qc),
  });
}
