// types/announcements.ts — site-announcement shapes (member read + admin CRUD).

/**
 * A super-sticky cross-space site announcement (a pinned post). Keys reflect the
 * real payloads: member read `GET jetonomy/v1/announcements/active` returns
 * `{id,title,space_id,url,created_at}`; admin `GET jetonomy-pro/v1/site-announcements`
 * returns `{id,title,space_id,status,created_at}` (no url).
 */
export interface SiteAnnouncement {
  id: number;
  title: string;
  space_id: number | null;
  url?: string | null;
  status?: string;
  created_at: string;
}

/** Body for POST /site-announcements/{id} (pin a post). */
export interface PinAnnouncementBody {
  expires_at?: string;
}
