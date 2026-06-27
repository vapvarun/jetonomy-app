// types/digest.ts — email-digest shapes (member prefs + admin tools).
//
// Member prefs map to GET/PATCH /users/me/digest-preferences (api/digest.ts).
// Admin tools map to /admin/digest/* (api/digest-admin.ts). Kept split so a
// member build never imports the admin route.

export type DigestFrequency = 'off' | 'daily' | 'weekly';

/** Logged-in member's digest preference. */
export interface DigestPreferences {
  /** Legacy convenience flag (mirrors frequency !== 'off'). */
  enabled?: boolean;
  frequency: DigestFrequency;
  /** Hour-of-day (0-23) the digest is sent; optional. */
  hour?: number;
}

/** Body for PATCH /users/me/digest-preferences. */
export interface UpdateDigestBody {
  frequency: DigestFrequency;
  hour?: number;
}

/** Admin digest stats (GET /admin/digest/stats). */
export interface DigestStats {
  subscribers: number;
  last_sent_at: string | null;
  sent_count: number;
  open_rate?: number | null;
  [k: string]: unknown;
}

/** Body for POST /admin/digest/test. */
export interface SendTestDigestBody {
  email?: string;
  frequency?: DigestFrequency;
}
