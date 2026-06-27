// api/leaderboards.ts — ranked members by reputation (free).

import { client, toApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type { LeaderboardPeriod, LeaderRow } from '@/types/leaderboard';

export interface LeaderboardQuery {
  period?: LeaderboardPeriod;
  limit?: number;
  offset?: number;
}

/** GET /leaderboards — period ∈ all|month|week (default all), limit 1–100. */
export async function getLeaderboard(
  q: LeaderboardQuery = {}
): Promise<ListEnvelope<LeaderRow>> {
  try {
    const res = await client.get<ListEnvelope<LeaderRow>>('/leaderboards', {
      params: { period: q.period ?? 'all', limit: q.limit, offset: q.offset },
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
