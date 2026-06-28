// hooks/useLeaderboard.ts — React Query for the reputation leaderboard.

import { useInfiniteQuery } from '@tanstack/react-query';

import { getLeaderboard } from '@/api/leaderboards';
import { dedupeBy } from '@/utils/dedupe';
import type { ListEnvelope } from '@/types/api';
import type { LeaderboardPeriod, LeaderRow } from '@/types/leaderboard';

const PAGE_LIMIT = 20;

/** Infinite, offset-paged ranked members for a period. */
export function useLeaderboard(period: LeaderboardPeriod) {
  const query = useInfiniteQuery<ListEnvelope<LeaderRow>, Error>({
    queryKey: ['leaderboard', period],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getLeaderboard({ period, limit: PAGE_LIMIT, offset: pageParam as number }),
    getNextPageParam: (last, pages) => {
      if (!last.meta.has_more) return undefined;
      return pages.reduce((n, p) => n + p.data.length, 0);
    },
  });
  // Offset paging can repeat a member across page boundaries when ranks shift
  // between fetches; dedupe by user_id (the row key) to keep keys unique.
  const rows: LeaderRow[] = dedupeBy(
    query.data?.pages.flatMap((p) => p.data) ?? [],
    (r) => r.user_id
  );
  return { ...query, rows };
}
