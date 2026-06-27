// api/announcements.ts — site announcements: member read + admin pin/unpin.
//
// Two distinct routes (different namespaces — verified against the live API):
//   member read : GET  jetonomy/v1/announcements/active        -> { data: [...], meta }
//   admin CRUD  : GET/POST/DELETE jetonomy-pro/v1/site-announcements[/{id}] -> { pins: [...] }
// listActive() degrades gracefully (-> []) so the banner just hides on any error;
// the admin fns throw so the management screen can render Error/Forbidden states.

import { client, proClient, toApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type {
  PinAnnouncementBody,
  SiteAnnouncement,
} from '@/types/announcements';

function unwrap(
  body:
    | SiteAnnouncement[]
    | ListEnvelope<SiteAnnouncement>
    | { pins?: SiteAnnouncement[] }
    | null
    | undefined
): SiteAnnouncement[] {
  if (!body) return [];
  if (Array.isArray(body)) return body;
  if ('pins' in body && Array.isArray(body.pins)) return body.pins;
  if ('data' in body && Array.isArray(body.data)) return body.data;
  return [];
}

/**
 * GET jetonomy/v1/announcements/active (member display path). NEVER throws — on
 * 404 (older site) / any error → []. The banner hides itself when empty.
 */
export async function listActive(): Promise<SiteAnnouncement[]> {
  try {
    const res = await client.get<ListEnvelope<SiteAnnouncement>>(
      '/announcements/active'
    );
    return unwrap(res.data);
  } catch {
    return [];
  }
}

/**
 * GET jetonomy-pro/v1/site-announcements (admin management path). THROWS on
 * error so the admin screen can render ForbiddenState / ErrorState.
 */
export async function list(): Promise<SiteAnnouncement[]> {
  try {
    const res = await proClient.get<{ pins?: SiteAnnouncement[] }>(
      '/site-announcements'
    );
    return unwrap(res.data);
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST jetonomy-pro/v1/site-announcements/{id} — pin a post as a site announcement. */
export async function pin(
  postId: number,
  body: PinAnnouncementBody = {}
): Promise<SiteAnnouncement> {
  try {
    const res = await proClient.post<SiteAnnouncement>(
      `/site-announcements/${postId}`,
      body
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE jetonomy-pro/v1/site-announcements/{id} — unpin. */
export async function unpin(postId: number): Promise<{ deleted: true }> {
  try {
    const res = await proClient.delete<{ deleted: true }>(
      `/site-announcements/${postId}`
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
