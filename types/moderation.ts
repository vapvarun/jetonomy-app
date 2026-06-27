// types/moderation.ts — moderation + flags shapes.
//
// SHARED between Part A (FlagButton / api/flags.ts member flow) and Part B
// (api/moderation.ts admin queue/flags). Declared once here; never duplicated.

/** Reason whitelist accepted by Moderation_Controller::create_flag. */
export type FlagReason = 'spam' | 'abuse' | 'off_topic' | 'other';

/** Object kinds the moderation surface acts on. */
export type ModeratedType = 'post' | 'reply';

/** Body for POST /flags (generic) — object_type+object_id pair. */
export interface CreateFlagBody {
  object_type: ModeratedType;
  object_id: number;
  reason: FlagReason;
  note?: string;
}

/** Body for POST /posts/{id}/flags (post-scoped alias). */
export interface FlagPostBody {
  reason: FlagReason;
  note?: string;
}

/** Result of creating a flag. */
export interface FlagResult {
  id: number;
  status: 'open';
}

/** A flag row in the global / per-object flag list. */
export interface Flag {
  id: number;
  object_type: ModeratedType;
  object_id: number;
  reason: FlagReason | string;
  note: string | null;
  reporter: {
    id: number;
    display_name: string;
    avatar_url: string | null;
  } | null;
  status: 'open' | 'resolved' | string;
  resolution?: string | null;
  created: string;
}

/** Body for POST /moderation/flags/{id}/resolve. */
export interface ResolveFlagBody {
  resolution?: string;
  action?: 'approve' | 'spam' | 'trash' | string;
}

/** A pending object in the global moderation queue. */
export interface QueueItem {
  object_type: ModeratedType;
  object_id: number;
  author: {
    id: number;
    display_name: string;
    avatar_url: string | null;
  } | null;
  excerpt: string;
  created: string;
  flags_count: number;
  space_id?: number | null;
  space_name?: string | null;
}

/** Per-item moderation verbs. */
export type ModerationAction = 'approve' | 'spam' | 'trash';

/** Body for POST /moderation/ban. */
export interface BanBody {
  user_id: number;
  reason?: string;
  space_id?: number;
  expires_at?: string;
}

/** Body for POST /moderation/bulk. */
export interface BulkActionBody {
  action: ModerationAction;
  items: Array<{ type: ModeratedType; id: number }>;
}

/** Coarse scope hint for the per-space moderation screen. */
export interface SpaceModerationScope {
  space_id: number;
  can_view_queue: boolean;
}
