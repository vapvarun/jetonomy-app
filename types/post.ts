// types/post.ts — exact fields from `Posts_Controller::prepare_post`.
// Content (02) owns this; space feeds, drafts, my-posts all reuse it.

export type PostType =
  | 'topic'
  | 'question'
  | 'discussion'
  | 'announcement'
  | 'idea'
  | 'status';

export type PostStatus = 'publish' | 'draft' | 'pending' | 'spam' | 'trash';

/** Post::valid_idea_statuses(). */
export type IdeaStatus = 'planned' | 'in_progress' | 'shipped' | 'declined';

export interface Post {
  id: number;
  space_id: number;
  author_id: number;
  prefix: string | null;
  prefix_color: string | null;
  title: string;
  slug: string;
  /** HTML — already run through Embeds::process; render via ContentBody. */
  content: string;
  content_plain: string;
  type: PostType | string;
  status: PostStatus | string;
  is_sticky: boolean;
  is_private: boolean;
  is_closed: boolean;
  is_resolved: boolean;
  idea_status: IdeaStatus | null;
  accepted_reply_id: number | null;
  view_count: number;
  reply_count: number;
  /** Net score; optimistic vote mutates this. */
  vote_score: number;
  last_reply_at: string | null;
  edited_at: string | null;
  edited_by: number | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Enriched author block (always present on list + detail).
  author_name: string;
  author_avatar: string;
  author_login: string;
  trust_level: number;
  reputation: number;
  /** Server-formatted "3 hours ago". */
  time_ago: string;
  profile_url: string;
  space_title: string;
  space_slug: string;

  // ---- Optional 1.6.0 viewer enrichments (prepare_post; absent on older sites) ----
  /** Viewer's current vote on this post (1/-1/0); seeds VoteButton when present. */
  viewer_vote?: 1 | -1 | 0 | null;
  is_bookmarked?: boolean;
  is_subscribed?: boolean;

  // ---- Pro seams (never set by free API; Pro-social spec narrows these) ----
  reactions?: unknown; // DO NOT consume here — Pro-social owns it
  poll?: unknown; // DO NOT consume here — Pro-social owns it
}

/** Local-only client vote state (NOT from API). Tracked per id in a Zustand slice. */
export interface UserVoteState {
  value: 1 | -1 | 0;
}
