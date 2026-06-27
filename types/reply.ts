// types/reply.ts — exact fields from `Replies_Controller::prepare_reply`.

import type { PostStatus } from '@/types/post';

export interface Reply {
  id: number;
  post_id: number;
  /** Threading: null = top-level. */
  parent_id: number | null;
  author_id: number;
  /** HTML via Embeds::process. */
  content: string;
  content_plain: string;
  status: PostStatus | string;
  is_accepted: boolean;
  vote_score: number;
  edited_at: string | null;
  edited_by: number | null;
  created_at: string | null;
  /** Aliased to created_at server-side. */
  published_at: string | null;
  author_name: string;
  author_avatar: string;
  author_login: string;
  trust_level: number;
  reputation: number;
  time_ago: string;
  profile_url: string;

  /** Optional 1.6.0 viewer enrichment. */
  viewer_vote?: 1 | -1 | 0 | null;

  /** Pro seam only (Pro-social narrows). */
  reactions?: unknown;
}

/** Split-reply response (POST /replies/{id}/split) — a thin new-topic stub. */
export interface SplitResult {
  id: number;
  title: string;
  slug: string;
  space_slug: string;
}
