// types/bookmark.ts — GET /bookmarks list items = LEAN post projection
// (NOT a full Content `Post`). Tap-through must getPost(id) for the full view.

export interface BookmarkItem {
  /** post id. */
  id: number;
  title: string;
  slug: string;
  space_id: number;
  vote_score: number;
  reply_count: number;
  bookmarked_at: string | null;
  created_at: string | null;
}

/** POST /bookmarks → toggle result (no count). */
export interface BookmarkToggleResult {
  bookmarked: boolean;
}
