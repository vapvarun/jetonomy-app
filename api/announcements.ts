// api/announcements.ts — site announcements: member read + admin pin/unpin.
//
// ⚠ Route perm is `permission_manage`. Whether ordinary members may read is
// unresolved (06 spec #39). listActive() therefore degrades gracefully: on
// 403/404 it resolves to [] so the member banner simply renders nothing rather
// than throwing. The admin CRUD fns surface errors normally (admin screens).

import { client, toApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type {
  PinAnnouncementBody,
  SiteAnnouncement,
} from '@/types/announcements';

function unwrap(
  body: SiteAnnouncement[] | ListEnvelope<SiteAnnouncement> | null | undefined
): SiteAnnouncement[] {
  if (!body) return [];
  return Array.isArray(body) ? body : body.data ?? [];
}

/**
 * GET /site-announcements (member display path). NEVER throws — on 403 (member
 * read not allowed), 404 (route absent on older sites), or any error → []. The
 * banner hides itself when the list is empty.
 */
export async function listActive(): Promise<SiteAnnouncement[]> {
  try {
    const res = await client.get<
      SiteAnnouncement[] | ListEnvelope<SiteAnnouncement>
    >('/site-announcements');
    return unwrap(res.data);
  } catch {
    return [];
  }
}

/**
 * GET /site-announcements (admin management path). THROWS on error so the admin
 * screen can render ForbiddenState / ErrorState.
 */
export async function list(): Promise<SiteAnnouncement[]> {
  try {
    const res = await client.get<
      SiteAnnouncement[] | ListEnvelope<SiteAnnouncement>
    >('/site-announcements');
    return unwrap(res.data);
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /site-announcements/{id} — pin a post as a site announcement. */
export async function pin(
  postId: number,
  body: PinAnnouncementBody = {}
): Promise<SiteAnnouncement> {
  try {
    const res = await client.post<SiteAnnouncement>(
      `/site-announcements/${postId}`,
      body
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE /site-announcements/{id} — unpin. */
export async function unpin(postId: number): Promise<{ deleted: true }> {
  try {
    const res = await client.delete<{ deleted: true }>(
      `/site-announcements/${postId}`
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
