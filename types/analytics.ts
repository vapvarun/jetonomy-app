// types/analytics.ts — admin analytics dashboard shapes (Pro).

/** GET /analytics/overview — headline KPIs. */
export interface AnalyticsOverview {
  total_posts: number;
  total_replies: number;
  total_members: number;
  active_members: number;
  posts_period?: number;
  replies_period?: number;
  new_members_period?: number;
  [k: string]: unknown;
}

/** A single point in an engagement time series. */
export interface EngagementPoint {
  date: string;
  posts: number;
  replies: number;
  votes?: number;
  active_users?: number;
}

/** GET /analytics/engagement — engagement trend. */
export interface EngagementSeries {
  range: { start: string; end: string };
  points: EngagementPoint[];
}

/** GET /analytics/top-spaces row. */
export interface TopSpace {
  id: number;
  name: string;
  slug: string;
  post_count: number;
  reply_count: number;
  member_count?: number;
}

/** GET /analytics/top-contributors row. */
export interface TopContributor {
  id: number;
  display_name: string;
  avatar_url: string | null;
  post_count: number;
  reply_count: number;
  reputation?: number;
}

/** GET /analytics/moderation — moderation activity stats. */
export interface ModerationStats {
  flags_open: number;
  flags_resolved: number;
  posts_removed: number;
  replies_removed: number;
  users_banned: number;
  [k: string]: unknown;
}

/** Filters shared across analytics requests. */
export interface AnalyticsRange {
  start?: string;
  end?: string;
  space_id?: number;
}

/** GET /analytics/export request. */
export interface ExportRequest extends AnalyticsRange {
  /** Server `/analytics/export` supports csv only. */
  format?: 'csv';
}

/** GET /analytics/diff-report (admin diagnostic). */
export interface DiffReport {
  range: { start: string; end: string };
  rows: Array<Record<string, unknown>>;
  [k: string]: unknown;
}
