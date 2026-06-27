// types/leaderboard.ts — ranked-member shapes (People domain 04).
// Source of truth: Leaderboards_Controller::list_items (Jetonomy 1.5.x).

export type LeaderboardPeriod = 'all' | 'month' | 'week';

export interface LeaderRow {
  rank: number;
  user_id: number;
  display_name: string;
  user_login: string;
  avatar_url: string;
  profile_url: string;
  reputation: number;
  post_count: number;
  reply_count: number;
  trust_level: number;
}
