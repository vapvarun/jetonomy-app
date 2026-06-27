// types/search.ts — /search rows are RAW jt_posts / jt_spaces / jt_tags rows
// (NOT prepare_post-enriched). No author_name/avatar; content is raw HTML.
// Treat as preview rows; fetch the full Post via getPost(id) on tap.

import type { Tag } from '@/types/tag';

export type SearchType = 'post' | 'reply' | 'space' | 'tag' | 'all';
export type SearchSort = 'relevance' | 'newest' | 'votes';

export interface SearchPostRow {
  id: number;
  space_id: number;
  author_id: number;
  title: string;
  slug: string;
  content: string;
  content_plain: string;
  type: string;
  status: string;
  vote_score: number;
  reply_count: number;
  created_at: string | null;
  space_title: string; // joined in
  space_slug: string; // joined in
  match_score?: number; // present when sort=relevance
  /** Server injects type:'post' into the `all` payload — kept distinct here. */
  type_tag?: 'post';
}

export interface SearchSpaceRow {
  id: number;
  title: string;
  slug: string;
  description: string;
  type_tag?: 'space';
  [k: string]: unknown; // + remaining jt_spaces cols
}

export type SearchTagRow = Tag & { type_tag?: 'tag' };

/** Query params accepted by GET /search. */
export interface SearchParams {
  q: string;
  type?: SearchType;
  space_id?: number;
  date_from?: string;
  date_to?: string;
  author_id?: number;
  author?: string; // name → id resolution server-side
  tag?: string; // slug
  sort?: SearchSort;
}

/** type=all combined-mode response. */
export interface SearchAllResponse {
  data: {
    posts: SearchPostRow[];
    spaces: SearchSpaceRow[];
    tags: SearchTagRow[];
  };
  meta: { total: number };
}
