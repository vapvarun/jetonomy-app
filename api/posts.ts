// api/posts.ts — posts CRUD + mod actions + drafts + home feed.
// One typed function per endpoint. No React here. All paths are relative to the
// jetonomy/v1 baseURL configured by the foundation `client`.

import { client, toApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type { IdeaStatus, Post, PostType } from '@/types/post';

export type PostSort = 'latest' | 'popular' | 'oldest' | 'newest' | 'unanswered';

export interface ListPostsQuery {
  limit?: number;
  after?: number;
  before?: number;
  offset?: number;
  sort?: PostSort;
}

export interface CreatePostBody {
  content: string;
  title?: string;
  type?: PostType | string;
  tags?: string[];
  prefix?: string;
  is_private?: boolean;
  status?: 'publish' | 'draft';
  published_at?: string;
  captcha_token?: string;
}

export interface UpdatePostBody {
  title?: string;
  content?: string;
  is_private?: boolean;
  prefix?: string;
  published_at?: string;
  /** status:'publish' alone publishes a draft. */
  status?: 'publish';
}

/** GET /spaces/{spaceId}/posts — cursor-paginated list. */
export async function listSpacePosts(
  spaceId: number,
  q: ListPostsQuery = {}
): Promise<ListEnvelope<Post>> {
  try {
    const res = await client.get<ListEnvelope<Post>>(`/spaces/${spaceId}/posts`, {
      params: q,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /posts/{id} — increments view_count server-side. */
export async function getPost(id: number): Promise<Post> {
  try {
    const res = await client.get<Post>(`/posts/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /spaces/{spaceId}/posts — returns the full created Post (201). */
export async function createPost(
  spaceId: number,
  body: CreatePostBody
): Promise<Post> {
  try {
    const res = await client.post<Post>(`/spaces/${spaceId}/posts`, body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** PATCH /posts/{id} — send changed fields only. */
export async function updatePost(id: number, body: UpdatePostBody): Promise<Post> {
  try {
    const res = await client.patch<Post>(`/posts/${id}`, body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE /posts/{id} — soft trash. */
export async function deletePost(id: number): Promise<{ deleted: true; id: number }> {
  try {
    const res = await client.delete<{ deleted: true; id: number }>(`/posts/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /posts/drafts — `{ data }` only, no meta/pagination. */
export async function listDrafts(): Promise<{ data: Post[] }> {
  try {
    const res = await client.get<{ data: Post[] }>('/posts/drafts');
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /posts/{id}/close — TOGGLE close/reopen; returns updated Post. */
export async function closePost(id: number): Promise<Post> {
  try {
    const res = await client.post<Post>(`/posts/${id}/close`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /posts/{id}/pin — TOGGLE; 400 jetonomy_pin_limit when cap hit. */
export async function pinPost(id: number): Promise<Post> {
  try {
    const res = await client.post<Post>(`/posts/${id}/pin`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /posts/{id}/move — move to another space. */
export async function movePost(id: number, targetSpaceId: number): Promise<Post> {
  try {
    const res = await client.post<Post>(`/posts/${id}/move`, {
      target_space_id: targetSpaceId,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /posts/{id}/merge — returns the merge TARGET post. */
export async function mergePost(id: number, targetPostId: number): Promise<Post> {
  try {
    const res = await client.post<Post>(`/posts/${id}/merge`, {
      target_post_id: targetPostId,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /posts/{id}/idea-status — ideas spaces only (400 otherwise). */
export async function setIdeaStatus(id: number, status: IdeaStatus): Promise<Post> {
  try {
    const res = await client.post<Post>(`/posts/${id}/idea-status`, {
      idea_status: status,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

// ---------------------------------------------------------------------------
// Home feed (plugin 1.6.0 GET /feed) with graceful 404 fallback to a
// space-scoped list. There is no global feed route on <1.6.0 sites, so the
// fallback resolves a default space and reads its posts (master-plan Note #1).
// ---------------------------------------------------------------------------

export interface FeedQuery {
  limit?: number;
  after?: number;
  sort?: PostSort;
}

/** Minimal space row used by the feed fallback + compose space picker. */
export interface SpaceLite {
  id: number;
  title: string;
  slug: string;
  type: string;
}

let cachedFallbackSpaceId: number | null = null;

/**
 * GET /spaces — lightweight first-page read used by the feed fallback and the
 * compose space picker. Intentionally kept local (not the Spaces domain api) so
 * Content has zero cross-domain import while Spaces (03) is still being built.
 */
export async function listSpacesLite(limit = 50): Promise<SpaceLite[]> {
  try {
    const res = await client.get<ListEnvelope<SpaceLite>>('/spaces', {
      params: { limit },
    });
    return res.data?.data ?? [];
  } catch (e) {
    throw toApiError(e);
  }
}

async function resolveFallbackSpaceId(): Promise<number | null> {
  if (cachedFallbackSpaceId != null) return cachedFallbackSpaceId;
  const spaces = await listSpacesLite();
  if (!spaces.length) return null;
  // Prefer a dedicated "feed" space if one exists, else the first space.
  const feed = spaces.find((s) => s.type === 'feed') ?? spaces[0];
  cachedFallbackSpaceId = feed.id;
  return feed.id;
}

export interface FeedResult extends ListEnvelope<Post> {
  /** When the /feed route 404s, the space we fell back to (for compose CTA etc.). */
  fallbackSpaceId?: number | null;
}

/**
 * GET /feed (1.6.0) → cross-space home feed. On 404 (older site) fall back to
 * the first/feed space's post list so Home always renders something.
 */
export async function getFeed(q: FeedQuery = {}): Promise<FeedResult> {
  try {
    const res = await client.get<ListEnvelope<Post>>('/feed', { params: q });
    return res.data;
  } catch (e) {
    const err = toApiError(e);
    if (err.status === 404) {
      const spaceId = await resolveFallbackSpaceId();
      if (spaceId == null) {
        return {
          data: [],
          meta: { count: 0, has_more: false, cursor_next: null },
          fallbackSpaceId: null,
        };
      }
      const list = await listSpacePosts(spaceId, {
        limit: q.limit,
        after: q.after,
        sort: q.sort,
      });
      return { ...list, fallbackSpaceId: spaceId };
    }
    throw err;
  }
}
