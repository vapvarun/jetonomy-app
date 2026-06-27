// types/space.ts — exact fields from `Spaces_Controller::prepare_space()` /
// `prepare_member()` / `get_privileged_members()` / `get_join_requests()`.
// Spaces (03) owns this. See 03-spaces-personal.md.

export type SpaceVisibility = 'public' | 'private' | 'hidden';
export type SpaceJoinPolicy = 'open' | 'approval' | 'invite';
export type SpaceType = 'forum' | 'qa' | 'ideas' | 'feed';
export type SpaceRole = 'viewer' | 'member' | 'moderator' | 'admin'; // VALID_ROLES

export interface Space {
  id: number;
  category_id: number | null;
  title: string;
  slug: string;
  description: string;
  /** server default falls back to admin "default_space_type". */
  type: SpaceType | string;
  visibility: SpaceVisibility;
  join_policy: SpaceJoinPolicy;
  /** emoji/dashicon token. */
  icon: string;
  /** URL or ''. */
  cover_image: string;
  /** decoded JSON object ({} when empty). */
  settings: Record<string, unknown>;
  member_count: number;
  post_count: number;
  sort_order: number;
  author_id: number | null;
  created_at: string | null;
  updated_at: string | null;
  /** ⇒ "Active N ago" recency on SpaceCard. */
  last_activity_at: string | null;

  // ---- Optional 1.6.0 viewer enrichments (prepare_space; absent on older sites) ----
  is_member?: boolean;
  viewer_role?: SpaceRole | null;
  is_subscribed?: boolean;
}

/** GET /spaces/{id}/members → prepare_member(). */
export interface SpaceMember {
  space_id: number;
  user_id: number;
  role: SpaceRole;
  joined_at: string | null;
  display_name: string;
  avatar_url: string;
  trust_level: number;
  reputation: number;
  profile_url: string;
}

/** GET /spaces/{id}/privileged-members → get_privileged_members() (LEANER shape). */
export interface PrivilegedMember {
  user_id: number;
  /** only 'admin' | 'moderator' returned. */
  role: SpaceRole;
  display_name: string;
  avatar_url: string;
}

/** GET /spaces/{id}/join-requests → get_join_requests(). */
export interface JoinRequest {
  id: number;
  user_id: number;
  display_name: string;
  avatar_url: string;
  profile_url: string;
  message: string;
  created_at: string;
}

// ---- Action responses ----
export interface JoinResult {
  status: 'joined';
  space_id: number;
  user_id: number;
  role: 'member';
} // 201
export interface PendingResult {
  status: 'pending';
  message: string;
} // 202
export interface LeaveResult {
  removed: true;
  space_id: number;
  user_id: number;
}
export interface RoleUpdateResult {
  updated: true;
  space_id: number;
  user_id: number;
  role: SpaceRole;
}
export interface InviteResult {
  token: string;
  invite_url: string;
  max_uses: number;
  expires_at: string | null;
}
export interface UseInviteResult {
  status: string;
  space_id: number;
  space_slug: string;
}
export interface JoinRequestActionResult {
  status: 'approved' | 'denied';
  request_id: number;
  space_id: number;
  user_id: number;
}

/** Either of the two `POST /spaces/{id}/members` outcomes. */
export type JoinSpaceResult = JoinResult | PendingResult;

/** `{data, meta:{total}}` — hand-rolled, not paginated_response. */
export interface JoinRequestEnvelope {
  data: JoinRequest[];
  meta: { total: number };
}
