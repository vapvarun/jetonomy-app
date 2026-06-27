// types/announcements.ts — site-announcement shapes (member read + admin CRUD).

/** A super-sticky cross-space site announcement (a pinned post). */
export interface SiteAnnouncement {
  id: number;
  title: string;
  excerpt: string;
  space_slug: string | null;
  url: string | null;
  pinned_at: string | null;
  expires_at: string | null;
}

/** Body for POST /site-announcements/{id} (pin a post). */
export interface PinAnnouncementBody {
  expires_at?: string;
}
