// hooks/useLeaderboard.ts — React Query for the reputation leaderboard.

import { useInfiniteQuery } from '@tanstack/react-query';

import { getLeaderboard } from '@/api/leaderboards';
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
  const rows: LeaderRow[] = query.data?.pages.flatMap((p) => p.data) ?? [];
  return { ...query, rows };
}
