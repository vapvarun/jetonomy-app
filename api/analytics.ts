// api/analytics.ts — admin analytics dashboard (Pro). All GET, manage_options.
//
// 1.4.2.x note: analytics surfaces auth errors rather than silent empty data —
// callers MUST render Error/Forbidden states, never a blank dashboard.

import { client, toApiError } from '@/api/client';
import type {
  AnalyticsOverview,
  AnalyticsRange,
  DiffReport,
  EngagementSeries,
  ExportRequest,
  ModerationStats,
  TopContributor,
  TopSpace,
} from '@/types/analytics';

/** GET /analytics/overview. */
export async function overview(
  range: AnalyticsRange = {}
): Promise<AnalyticsOverview> {
  try {
    const res = await client.get<AnalyticsOverview>('/analytics/overview', {
      params: range,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /analytics/engagement. */
export async function engagement(
  range: AnalyticsRange = {}
): Promise<EngagementSeries> {
  try {
    const res = await client.get<EngagementSeries>('/analytics/engagement', {
      params: range,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /analytics/top-spaces. */
export async function topSpaces(limit = 10): Promise<TopSpace[]> {
  try {
    const res = await client.get<TopSpace[] | { data: TopSpace[] }>(
      '/analytics/top-spaces',
      { params: { limit } }
    );
    const body = res.data;
    return Array.isArray(body) ? body : body.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /analytics/top-contributors. */
export async function topContributors(limit = 10): Promise<TopContributor[]> {
  try {
    const res = await client.get<TopContributor[] | { data: TopContributor[] }>(
      '/analytics/top-contributors',
      { params: { limit } }
    );
    const body = res.data;
    return Array.isArray(body) ? body : body.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /analytics/moderation. */
export async function moderationStats(
  range: AnalyticsRange = {}
): Promise<ModerationStats> {
  try {
    const res = await client.get<ModerationStats>('/analytics/moderation', {
      params: range,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/**
 * GET /analytics/export — returns the raw CSV/JSON payload so the screen can
 * hand it to a share sheet. Returns the string body + content type.
 */
export async function exportData(
  req: ExportRequest = {}
): Promise<{ body: string; format: 'csv' }> {
  try {
    // Server `/analytics/export` enum is csv-only; the body is just handed to a
    // Share sheet (never parsed), so CSV is the right shareable format.
    const format = 'csv' as const;
    const res = await client.get('/analytics/export', {
      params: { ...req, format },
      responseType: 'text',
      transformResponse: (d) => d,
    });
    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    return { body, format };
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /analytics/diff-report (admin diagnostic). */
export async function diffReport(
  range: AnalyticsRange = {}
): Promise<DiffReport> {
  try {
    const res = await client.get<DiffReport>('/analytics/diff-report', {
      params: range,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
