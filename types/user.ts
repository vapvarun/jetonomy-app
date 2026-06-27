// types/user.ts — user shapes (foundation-owned; sibling domains extend, never redefine).

/** GET/PATCH /jetonomy/v1/users/me — the authenticated member. */
export interface Me {
  id: number;
  user_id: number;
  email: string;
  display_name: string;
  reputation: number;
  post_count: number;
  reply_count: number;
  trust_level: number;
  trust_level_name: string;
  /** Present on GET, absent on PATCH responses. */
  spaces_joined_count?: number;
  bio: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  /** Decoded JSON settings (incl. settings.notifications). */
  settings: Record<string, unknown>;
  email_opt_out: boolean;
  /** jetonomy_profile_response filter may append custom-fields / badges. */
  [k: string]: unknown;
}

/** GET /users/{id} and /users/by-login/{login} (consumed by Profile domain). */
export interface PublicUser {
  id: number;
  display_name: string;
  trust_level: number;
  trust_level_name: string;
  reputation: number;
  post_count: number;
  reply_count: number;
  bio: string | null;
  avatar_url: string | null;
  created_at: string | null;
  last_seen_at: string | null;
}

/** GET /users/suggest item (consumed by Compose/mention domain). */
export interface UserSuggestion {
  id: number;
  login: string;
  display_name: string;
  avatar_url: string;
}

/** Per-notification-type delivery toggles. */
export interface NotificationPreferences {
  // valid keys: reply_to_post, reply_to_reply, mention, vote_on_post,
  // accepted_answer, new_post_in_sub, badge_earned
  [type: string]: { web: boolean; email: boolean };
}
