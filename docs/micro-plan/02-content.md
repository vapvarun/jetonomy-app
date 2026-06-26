# Micro Build Plan — 02 · Content Domain

Posts · Replies · Votes · Drafts · Compose · Tags · Search · Activity/Updates · oEmbed/Link-Preview

Authoritative source: `vapvarun/jetonomy` `audit/manifest.json` (rest.endpoints) + the controllers under
`includes/api/` — read against code on 2026-06-27 (Jetonomy 1.5.x line). Every contract below was lifted
from the actual controller method, not the manifest summary; where the two disagree it is flagged in
**Cross-Domain Notes**.

## Fixed conventions (inherited from foundation spec 01)

- Expo SDK 52 + TS, expo-router (`app/`), Zustand (`stores/`), React Query (`hooks/`), axios (`api/`), NativeWind.
- `client` = axios instance from foundation, `baseURL = ${siteUrl}/wp-json/jetonomy/v1`, WP Application-Password Basic auth attached by foundation. **Never** redefine auth or baseURL here. All paths below are written relative to that baseURL (so `client.get('/search')` hits `…/jetonomy/v1/search`).
- Pro gating via `useAppConfig().features.*`. Reactions + Polls are **Pro** and are NOT implemented here — only typed seams are left (see "Pro seams").
- Errors: WP REST error envelope `{ code, message, data:{ status } }`. Foundation's response interceptor normalizes to a thrown `ApiError` with `.status`/`.code`/`.message`; hooks below assume that.

## Shared response envelopes (exact, from `Base_Controller::paginated_response`)

```ts
// types/api.ts (foundation owns this file; referenced here)
export interface ListMeta {
  count: number;            // items in THIS page
  has_more: boolean;        // (offset + count) < total
  cursor_next: number | null; // last item id in page → pass as `after` for next page
  total?: number;           // present on most lists (also mirrored in X-WP-Total header)
  offset?: number;          // echoed back for offset-mode
}
export interface ListEnvelope<T> { data: T[]; meta: ListMeta; }
```

- **List endpoints** (`/spaces/{id}/posts`, `/posts/{id}/replies`, `/tags`) return `ListEnvelope<T>`.
- **Single-item** GET/PATCH/POST-action/`create` return the **bare object** (e.g. `Post`), NOT wrapped in `data`.
- **Drafts** returns `{ data: Post[] }` (no `meta`).
- **Search** is special (see api/search.ts).
- **Updates** returns `{ data, since, scope, meta:{count,has_more} }`.

### Pagination contract (every list)

Query params (from `Base_Controller::get_collection_params` + `get_pagination`):
`limit` (1-100, server default 20; space posts fall back to `Space::get_posts_per_page` when omitted),
`after` (cursor = id, primary), `before`, `offset` (legacy), `sort`.
**Cursor rule:** infinite scroll passes `after = meta.cursor_next` from the previous page; stop when `has_more === false`. Do NOT use `offset` for infinite scroll (kept only for jump-to-page).

---

## types/post.ts — exact fields from `Posts_Controller::prepare_post`

```ts
export type PostType = 'topic' | 'question' | 'discussion' | 'announcement' | 'idea' | 'status';
export type PostStatus = 'publish' | 'draft' | 'pending' | 'spam' | 'trash';
export type IdeaStatus = 'planned' | 'in_progress' | 'shipped' | 'declined'; // Post::valid_idea_statuses()

export interface Post {
  id: number;
  space_id: number;
  author_id: number;
  prefix: string | null;
  prefix_color: string | null;
  title: string;
  slug: string;
  content: string;          // HTML, already run through Embeds::process → render via ContentBody/utils/html
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
  vote_score: number;       // net score; optimistic vote mutates this
  last_reply_at: string | null;
  edited_at: string | null;
  edited_by: number | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  // enriched author block (always present on list + detail)
  author_name: string;
  author_avatar: string;
  author_login: string;
  trust_level: number;
  reputation: number;
  time_ago: string;         // server-formatted "3 hours ago"
  profile_url: string;
  space_title: string;
  space_slug: string;
  // Pro seam (never set by free API): custom-field / reaction payloads arrive via
  // jetonomy_post_response filter. Type as optional unknown; Pro spec narrows it.
  reactions?: unknown;      // DO NOT consume here — Pro-social spec owns it
  poll?: unknown;           // DO NOT consume here — Pro-social spec owns it
}

// Local-only client vote state (NOT from API — see votes note). Track per id in a Zustand slice.
export interface UserVoteState { value: 1 | -1 | 0; }
```

## types/reply.ts — exact fields from `Replies_Controller::prepare_reply`

```ts
export interface Reply {
  id: number;
  post_id: number;
  parent_id: number | null;   // threading: null = top-level
  author_id: number;
  content: string;            // HTML via Embeds::process
  content_plain: string;
  status: PostStatus | string;
  is_accepted: boolean;
  vote_score: number;
  edited_at: string | null;
  edited_by: number | null;
  created_at: string | null;
  published_at: string | null; // aliased to created_at server-side
  author_name: string;
  author_avatar: string;
  author_login: string;
  trust_level: number;
  reputation: number;
  time_ago: string;
  profile_url: string;
  reactions?: unknown;        // Pro seam only
}

// Split-reply response (POST /replies/{id}/split) is a thin new-topic stub, NOT a Reply:
export interface SplitResult { id: number; title: string; slug: string; space_slug: string; }
```

## types/vote.ts, types/tag.ts, types/search.ts, types/linkPreview.ts, types/update.ts

```ts
// votes — response = Vote::cast result merged with current score
export interface VoteResponse {
  action: 'created' | 'removed' | 'updated' | 'none';
  old_value?: number | null;
  score: number;            // authoritative new vote_score — reconcile optimistic UI against this
}

// tags — jt_tags row (schema: id,name,slug,post_count)
export interface Tag { id: number; name: string; slug: string; post_count: number; }

// search — results are RAW jt_posts / jt_spaces / jt_tags rows (NOT prepare_post-enriched).
// No author_name/avatar; content is raw HTML. Treat as preview rows; fetch full Post on tap.
export interface SearchPostRow {
  id: number; space_id: number; author_id: number; title: string; slug: string;
  content: string; content_plain: string; type: string; status: string;
  vote_score: number; reply_count: number; created_at: string | null;
  space_title: string; space_slug: string;      // joined in
  match_score?: number;                          // present when sort=relevance
  type_tag: 'post';                              // server injects `type:'post'` — see note re. field clash
}
export interface SearchSpaceRow { id: number; title: string; slug: string; description: string; /* +jt_spaces cols */ type_tag: 'space'; }
export type SearchTagRow = Tag & { type_tag?: 'tag' };
// typed mode (type=post|reply|space|tag): ListEnvelope<row & {type:string}>
// combined mode (type=all): { data: { posts: SearchPostRow[]; spaces: SearchSpaceRow[]; tags: SearchTagRow[] }; meta:{ total } }

// link-preview — exact Preview_Data::to_array()
export interface LinkPreview {
  url: string; original_url: string; title: string; description: string;
  image: string; image_alt: string; site_name: string; domain: string;
  favicon: string; type: string; provider: string; locale: string;
  published_at: string; author: string; embed_html: string;
}

// updates — activity-log delta rows (global/space) or reply-id list (post scope)
export interface ActivityRow { action: string; object_type: 'post' | 'reply' | string; object_id: number; created_at: string; }
export interface UpdatesResponse {
  data: ActivityRow[] | number[];  // number[] when scope='post' (new reply ids)
  since: string; scope: 'global' | 'space' | 'post';
  meta: { count: number; has_more: boolean };
}

// oembed — oEmbed 1.0 (mostly server-to-server; optional in-app use)
export interface OEmbed {
  version: '1.0'; type: 'rich' | 'link'; title: string;
  author_name: string; author_url: string; provider_name: string; provider_url: string;
  cache_age: number; description?: string;
  thumbnail_url?: string; thumbnail_width?: number; thumbnail_height?: number;
  width?: number; height?: number; html?: string; // rich only
}
```

---

## api/ layer — one typed function per endpoint

All functions live in `api/`, import `client`, return the parsed body. No React here.

### api/posts.ts

| Function | METHOD path | Controller | Params / body | Returns |
|---|---|---|---|---|
| `listSpacePosts(spaceId, q)` | GET `/spaces/{spaceId}/posts` | Posts_Controller::list_items | query `{ limit?, after?, offset?, sort? }` sort∈`latest\|popular\|oldest\|newest\|unanswered` (default latest) | `ListEnvelope<Post>` |
| `getPost(id)` | GET `/posts/{id}` | Posts_Controller::get_item | — (increments view_count server-side) | `Post` |
| `createPost(spaceId, body)` | POST `/spaces/{spaceId}/posts` | Posts_Controller::create_item | body `{ content* , title?, type?, tags?:string[], prefix?, is_private?, status?:'publish'\|'draft', published_at?, captcha_token? }` | `Post` (201) |
| `updatePost(id, body)` | PATCH `/posts/{id}` | Posts_Controller::update_item | body any of `{ title?, content?, is_private?, prefix?, published_at?, status?:'publish' }` (status='publish' alone = publish a draft) | `Post` |
| `deletePost(id)` | DELETE `/posts/{id}` | Posts_Controller::delete_item | — (soft trash) | `{ deleted: true; id: number }` |
| `listDrafts()` | GET `/posts/drafts` | Posts_Controller::list_drafts | — (auth) | `{ data: Post[] }` |
| `closePost(id)` | POST `/posts/{id}/close` | Posts_Controller::close_post | — (TOGGLE close/reopen) | `Post` |
| `pinPost(id)` | POST `/posts/{id}/pin` | Posts_Controller::pin_post | — (TOGGLE; 400 `jetonomy_pin_limit` when cap hit) | `Post` |
| `movePost(id, targetSpaceId)` | POST `/posts/{id}/move` | Posts_Controller::move_post | body `{ target_space_id* }` | `Post` |
| `mergePost(id, targetPostId)` | POST `/posts/{id}/merge` | Posts_Controller::merge_post | body `{ target_post_id* }` → returns merge TARGET post | `Post` |
| `setIdeaStatus(id, status)` | POST `/posts/{id}/idea-status` | Posts_Controller::set_idea_status | body `{ idea_status* }` ∈ IdeaStatus; 400 if space.type≠ideas | `Post` |

`closePost`/`pinPost` are **toggles** — UI label derives from returned `is_closed`/`is_sticky`. Mod actions
(`move`/`merge`/`idea-status`/`pin`/`close`) return 403 for non-privileged users; gate the buttons on
capability flags surfaced by the foundation `me` payload, not by trial-and-error.

### api/replies.ts

| Function | METHOD path | Controller | Params / body | Returns |
|---|---|---|---|---|
| `listReplies(postId, q)` | GET `/posts/{postId}/replies` | Replies_Controller::list_items | query `{ limit?, after?, offset?, sort? }` sort∈`oldest\|newest\|best` (default oldest) | `ListEnvelope<Reply>` |
| `createReply(postId, body)` | POST `/posts/{postId}/replies` | Replies_Controller::create_item | body `{ content*, parent_id?, published_at?, captcha_token? }` (403 if post closed/space locked) | `Reply` (201) |
| `updateReply(id, body)` | PATCH `/replies/{id}` | Replies_Controller::update_item | body `{ content?, published_at? }` | `Reply` |
| `deleteReply(id)` | DELETE `/replies/{id}` | Replies_Controller::delete_item | — (soft trash) | `{ deleted:true; id }` |
| `acceptReply(id)` | POST `/replies/{id}/accept` | Replies_Controller::accept_reply | — (Q&A only; 400 if space.type≠qa) | `Reply` |
| `unacceptReply(id)` | DELETE `/replies/{id}/accept` | Replies_Controller::unaccept_reply | — | `Reply` |
| `splitReply(id, body)` | POST `/replies/{id}/split` | Replies_Controller::split_reply | body `{ title*, space_id? }` | `SplitResult` (201) |

### api/votes.ts

| Function | METHOD path | Controller | Body | Returns |
|---|---|---|---|---|
| `votePost(id, value)` | POST `/posts/{id}/vote` | Votes_Controller::vote_post | `{ value: 1 \| -1 }` | `VoteResponse` |
| `unvotePost(id)` | DELETE `/posts/{id}/vote` | Votes_Controller::unvote_post | — (re-casts existing to toggle off) | `VoteResponse` |
| `voteReply(id, value)` | POST `/replies/{id}/vote` | Votes_Controller::vote_reply | `{ value: 1 \| -1 }` | `VoteResponse` |
| `unvoteReply(id)` | DELETE `/replies/{id}/vote` | Votes_Controller::unvote_reply | — | `VoteResponse` |

Server rules to honor in UI: self-downvote → 400; self-upvote allowed (site may disable). 1/-1 only.
Re-POSTing the same value toggles off (so a single `vote(id, value)` that diffs against local state is
enough — DELETE is only needed when you don't know the current value).

### api/tags.ts
| `listTags(q?)` | GET `/tags` | Tags_Controller::list_tags | query `{ limit?(≤100,def30), sort?:'popular'\|'alphabetical' }` | `ListEnvelope<Tag>` |
(`/space-tags` was removed in 1.5.0 — do not add.)

### api/search.ts
| `search(q)` | GET `/search` | Search_Controller::search | query `{ q*(≥2 chars), type?:'post'\|'reply'\|'space'\|'tag'\|'all'(def post), space_id?, date_from?, date_to?, author_id?, author?(name→id), tag?(slug), sort?:'relevance'\|'newest'\|'votes' }` | typed: `ListEnvelope<row>`; `all`: `{ data:{posts,spaces,tags}, meta:{total} }` |
Two return shapes — branch on the `type` argument. Page size is fixed server-side (20 rows; tags 10) with
no `limit`/`offset` honored, so search has **no infinite scroll** — it is a single ranked page. Tag-screen
(`app/tag/[tag]`) uses `search({ type:'post', tag: <slug>, sort:'newest' })`.

### api/updates.ts
| `getUpdates(q)` | GET `/updates` | Updates_Controller::get_updates | query `{ since*(ISO8601 or MySQL datetime), scope?:'global'\|'space'\|'post'(def global), id?(req for space/post) }` | `UpdatesResponse` |
`scope='post'` is public-readable (anon can poll a readable thread) and returns `number[]` of new reply
ids → drives the "N new replies" banner on `app/post/[id]`. `global`/`space` require auth and return
`ActivityRow[]`. Send `Cache-Control: no-cache` is server-set; client must not cache.

### api/linkPreview.ts
| `getLinkPreview(url)` | GET `/link-preview` | Posts_Controller::link_preview | query `{ url* }` (400 on invalid/SSRF) | `LinkPreview` |
| `getOEmbed(url, opts?)` | GET `/oembed` | OEmbed_Controller::handle | query `{ url*, type?:'rich'\|'link', maxwidth?, maxheight? }` | `OEmbed` |
`getLinkPreview` powers in-content URL cards in `ContentBody`. `getOEmbed` is for unfurling **Jetonomy
thread** URLs specifically — low priority in-app (we render thread links natively); include the function,
mark optional.

---

## hooks/ — React Query

### hooks/usePosts.ts
- `useSpacePosts(spaceId, sort)` → `useInfiniteQuery`
  - key `['posts', spaceId, sort]`; `queryFn` uses `pageParam` as `after`; `getNextPageParam = (last) => last.meta.has_more ? last.meta.cursor_next : undefined`.
  - `select` flattens `pages.flatMap(p => p.data)`.
- `usePost(id)` → `useQuery(['post', id], () => getPost(id))`. `staleTime` short (view_count side-effect ⇒ fine to refetch on focus).
- `useDrafts()` → `useQuery(['drafts'], listDrafts, { select: r => r.data })`.
- Mutations (invalidate on success):
  - `useCreatePost(spaceId)` → on success invalidate `['posts', spaceId]` + `['space', spaceId]` (cross-domain) + `['drafts']` when draft.
  - `useUpdatePost(id)` / `useDeletePost(id)` → invalidate `['post', id]` + parent list.
  - `usePublishDraft(id)` = updatePost(id,{status:'publish'}) → invalidate `['drafts']` + lists.
  - Mod toggles `useClosePost`/`usePinPost`/`useMovePost`/`useMergePost`/`useSetIdeaStatus`:
    **optimistic** patch of the cached `Post` (`is_closed`/`is_sticky`/`idea_status`) then reconcile with returned object; rollback on error (handles multi-actor "already pinned/closed" gracefully — the returned object is source of truth).

### hooks/useReplies.ts
- `useReplies(postId, sort)` → `useInfiniteQuery` (same cursor pattern; key `['replies', postId, sort]`).
- `useCreateReply(postId)` → **optimistic**: push a temp `Reply` (negative temp id, `status:'publish'`, author from `me`) into the infinite-query cache, then replace with server `Reply` (201) on success; on error remove temp + surface composer error. Invalidate `['post', postId]` (reply_count, last_reply_at) and post-scope `useUpdates`.
- `useUpdateReply`/`useDeleteReply` → optimistic content swap / removal.
- `useAcceptReply(postId)` / `useUnacceptReply(postId)` → optimistic `is_accepted` + parent `is_resolved`/`accepted_reply_id`; single-accept invariant (clear previous accepted in cache).
- `useSplitReply(id)` → no cache patch; on success navigate to new topic (`SplitResult.space_slug`/`slug`).

### hooks/useVotes.ts (vote mutation helper used by VoteButton)
- `useVote({ kind:'post'|'reply', id })` returns `vote(next: 1|-1|0)`:
  - **Optimistic**: from local `UserVoteState.value` compute score delta (`next - current`), patch the cached object's `vote_score` and the local vote slice immediately.
  - Fire `votePost/voteReply` (value 1/-1) or `unvotePost/unvoteReply` (when toggling to 0). On 200, set `vote_score = VoteResponse.score` (authoritative) and reconcile local value. On error (e.g. self-downvote 400) rollback + toast `message`.
  - Patches every cache that holds the object: `['post',id]`, the space-posts infinite list, and reply lists.

### hooks/useSearch.ts
- `useSearch(params)` → `useQuery(['search', params], () => search(params), { enabled: params.q.length >= 2, keepPreviousData: true })`. No infinite (single page). Debounce the `q` input in `SearchBar` (300ms) before it reaches the hook.
- `useSimilarTopics(title)` → `useQuery(['similar', title], () => search({ q: title, type:'post', sort:'relevance' }), { enabled: title.trim().length >= 5, keepPreviousData: true })` — feeds `SimilarTopics` in compose. Debounce 400ms.
- `useTags(sort)` → `useQuery(['tags', sort], () => listTags({ sort }), { select: r => r.data, staleTime: 5*60_000 })`.

### hooks/useUpdates.ts
- `useNewReplies(postId, since)` → polling `useQuery(['updates','post',postId,since], () => getUpdates({ scope:'post', id:postId, since }), { refetchInterval: 15_000 })`; returns new reply id count for the banner.

---

## components/

| File | Responsibility | Consumes | States |
|---|---|---|---|
| `PostCard` | feed/list row: prefix chip (`prefix`/`prefix_color`), title, author block (`author_avatar`,`author_name`,`time_ago`), `vote_score`/`reply_count`/`view_count`, sticky/closed/resolved badges, `idea_status` chip | `Post` | n/a (data row); skeleton variant for list loading |
| `ReplyItem` | threaded reply (indent by `parent_id` depth, cap depth ~3 then flatten), quote-reply action (prefills Composer with blockquote of `content_plain`), accepted-answer badge, inline `VoteButton`, edited marker | `Reply` | edited/accepted/deleted(optimistic temp) |
| `VoteButton` | up/down control, **optimistic** via `useVote`; disabled+reason for self-downvote; reflects local `UserVoteState` + `vote_score` | `{kind,id,score,userValue}` | pending(optimistic)/error(rollback toast) |
| `Composer` | shared rich/markdown body editor + image attach (delegates upload to foundation `media` api, inserts returned URL as markdown/img), @mention autocomplete hook point, submit | used by post/new, post/edit, reply, quote | empty(disabled submit)/submitting/error |
| `SearchBar` | debounced query input + type/tag filter chips | drives `useSearch` | idle/typing/empty-query(<2) |
| `SimilarTopics` | typeahead list under compose title using `useSimilarTopics` | `SearchPostRow[]` | loading/empty(none)/list |
| `TagChip` | tag pill linking to `app/tag/[tag]` | `Tag` / slug | n/a |
| `ContentBody` | render server HTML (`content`) safely via `utils/html` (RN HTML renderer), link-card augmentation via `getLinkPreview` for bare URLs, image lightbox | `{ html }` | loading(link cards)/error(fallback raw link) |
| `ReactionBar` *(Pro seam — stub)* | placeholder; renders nothing unless `features.reactions` | — | **do not implement** — Pro-social spec attaches |
| `PollView` *(Pro seam — stub)* | placeholder; renders nothing unless `features.polls` | — | **do not implement** |

---

## app/ screens

### app/(tabs)/index.tsx — Home feed
- Sort selector **Hot / New / Top** → maps to server sort: **Hot→`popular`, New→`latest`, Top→`popular`** (server has no all-time-votes sort for space lists — see Cross-Domain Note #1). Persist choice in a Zustand `uiPrefs` slice.
- Data: `useSpacePosts(spaceId, sort)` infinite list of `PostCard`. **`spaceId` is required** — there is no global cross-space feed endpoint (Note #1). Home resolves a feed space from `useAppConfig().home_space_id` (foundation) or the user's first/pinned space; if none, show space picker.
- Pull-to-refresh → `refetch`; infinite scroll → `fetchNextPage` while `hasNextPage`.
- States: loading(skeleton PostCards) / empty("No posts yet" + compose CTA) / error(retry).

### app/post/[id].tsx — detail
- `usePost(id)` header (title, author, `ContentBody`, vote, mod menu gated on caps) + `useReplies(id, sort)` threaded list (sort oldest/newest/best) + reply `Composer` (sticky bottom; hidden/disabled when `is_closed`).
- New-replies banner via `useNewReplies(id, lastSeenAt)`; tap → refetch + scroll.
- `ReactionBar`/`PollView` seams mounted but inert unless feature flag on.
- Mod actions surface `closePost`/`pinPost`/`movePost`/`mergePost`/`setIdeaStatus`; Q&A `acceptReply`/`unacceptReply` on each ReplyItem when space.type==='qa' and viewer is post author/mod.
- States: loading / not-found(404 → "Thread not found") / forbidden(403 private) / empty-replies / error.

### app/post/new.tsx — compose
- Space picker (foundation spaces api) → drives `type` default (qa→question, ideas→idea, feed→status, else topic; user can override via `type` enum). Title field (omit/auto-derive for feed spaces). `SimilarTopics` under title (debounced `useSimilarTopics`). Body via `Composer` (rich/markdown + image attach). Tags input (`tags: string[]`). `is_private`, `prefix` (from space settings), Save-as-draft (`status:'draft'`) vs Publish.
- `useCreatePost(spaceId)`; on 201 navigate to `app/post/[id]`. Handle 400 rate-limit/captcha/validation inline.
- States: editing / submitting / error(field + global).

### app/post/edit/[id].tsx
- Prefill from `usePost(id)`; `useUpdatePost(id)` with changed fields only (PATCH semantics — send only edited keys). Publish-draft button when `status==='draft'`.
- States: loading prefill / saving / forbidden(not author/mod) / error.

### app/drafts.tsx
- `useDrafts()` list of `PostCard` (status=draft); row actions: edit (→edit screen), publish-now (`usePublishDraft`), delete.
- States: loading / empty("No drafts") / error.

### app/search.tsx
- `SearchBar` (debounced) → `useSearch`. Default `type:'all'` rendering three grouped sections (Posts / Spaces / Users? — **note:** server "all" returns posts+spaces+**tags**, NOT users; user search is a separate Users controller — see Note #4). Type filter chips switch to single-type `ListEnvelope` rendering. Tag filter chip sets `tag`. Result tap on a post → fetch full `Post` via `getPost` (search rows are raw, un-enriched).
- States: idle(recent/empty) / query-too-short(<2) / loading / no-results / error.

### app/tag/[tag].tsx
- Header = tag name; list = `useSearch({ type:'post', tag, sort })` (single page, sort newest/votes/relevance). `TagChip`s for related not available server-side (skip).
- States: loading / empty / error.

---

## Pro seams (leave clearly marked, do NOT implement)
- `Post.reactions` / `Reply.reactions` / `Post.poll` optional fields typed as `unknown`.
- `ReactionBar` + `PollView` component stubs mounted in `app/post/[id].tsx`, render `null` unless `useAppConfig().features.reactions` / `.polls`. The Pro-social micro-plan attaches the reaction endpoints + poll vote UI to these exact mount points and narrows the `unknown` types.

---

## COVERAGE TABLE — every content-domain endpoint → api function

| METHOD path | Controller::method | api fn (file) | Notes |
|---|---|---|---|
| GET `/spaces/{space_id}/posts` | Posts::list_items | `listSpacePosts` (posts.ts) | cursor infinite; sort+5 enum incl. unanswered |
| POST `/spaces/{space_id}/posts` | Posts::create_item | `createPost` (posts.ts) | optimistic-none (201 returns full Post); invalidates list+drafts |
| GET `/posts/{id}` | Posts::get_item | `getPost` (posts.ts) | view_count++ server-side |
| PATCH `/posts/{id}` | Posts::update_item | `updatePost` (posts.ts) | changed-fields only; status:'publish' publishes draft |
| DELETE `/posts/{id}` | Posts::delete_item | `deletePost` (posts.ts) | soft trash |
| GET `/posts/drafts` | Posts::list_drafts | `listDrafts` (posts.ts) | `{data}` only, no meta, no pagination |
| POST `/posts/{id}/close` | Posts::close_post | `closePost` (posts.ts) | TOGGLE; optimistic is_closed |
| POST `/posts/{id}/pin` | Posts::pin_post | `pinPost` (posts.ts) | TOGGLE; optimistic is_sticky; 400 pin-limit |
| POST `/posts/{id}/move` | Posts::move_post | `movePost` (posts.ts) | body target_space_id |
| POST `/posts/{id}/merge` | Posts::merge_post | `mergePost` (posts.ts) | returns target post |
| POST `/posts/{id}/idea-status` | Posts::set_idea_status | `setIdeaStatus` (posts.ts) | ideas spaces only |
| GET `/link-preview` | Posts::link_preview | `getLinkPreview` (linkPreview.ts) | in-content URL cards |
| POST `/posts/{id}/vote` | Votes::vote_post | `votePost` (votes.ts) | optimistic; reconcile score |
| DELETE `/posts/{id}/vote` | Votes::unvote_post | `unvotePost` (votes.ts) | toggle-off |
| GET `/posts/{post_id}/replies` | Replies::list_items | `listReplies` (replies.ts) | cursor infinite; sort oldest/newest/best |
| POST `/posts/{post_id}/replies` | Replies::create_item | `createReply` (replies.ts) | optimistic temp reply |
| PATCH `/replies/{id}` | Replies::update_item | `updateReply` (replies.ts) | |
| DELETE `/replies/{id}` | Replies::delete_item | `deleteReply` (replies.ts) | soft trash |
| POST `/replies/{id}/accept` | Replies::accept_reply | `acceptReply` (replies.ts) | qa spaces only |
| DELETE `/replies/{id}/accept` | Replies::unaccept_reply | `unacceptReply` (replies.ts) | **not in manifest** (code only) |
| POST `/replies/{id}/split` | Replies::split_reply | `splitReply` (replies.ts) | manifest names it `split_item`; real method `split_reply` |
| POST `/replies/{id}/vote` | Votes::vote_reply | `voteReply` (votes.ts) | optimistic |
| DELETE `/replies/{id}/vote` | Votes::unvote_reply | `unvoteReply` (votes.ts) | toggle-off |
| GET `/search` | Search::search | `search` (search.ts) | two shapes (typed vs all); fixed 20/10 page, no infinite |
| GET `/tags` | Tags::list_tags | `listTags` (tags.ts) | popular/alphabetical |
| GET `/updates` | Updates::get_updates | `getUpdates` (updates.ts) | post-scope public; global/space auth |
| GET `/oembed` | OEmbed::handle | `getOEmbed` (linkPreview.ts) | manifest names `get_oembed`; real method `handle`. Optional in-app |
| GET `/replies/{id}` | *(none)* | **n/a** | Manifest lists `Replies::get_item` GET but the controller registers only PATCH+DELETE — **no GET route, no `get_item` method exists**. Single reply is obtained from the parent post's reply list / post detail payload, not a dedicated fetch. |

**28/28 live content endpoints mapped** to api functions; **1 manifest-listed GET `/replies/{id}` is n/a** (not implemented in code).

---

## Cross-Domain Notes (for the compiler / foundation + spaces + users + Pro specs)

1. **No global feed endpoint.** The only post-list route is space-scoped (`GET /spaces/{id}/posts`). The Home tab MUST resolve a `spaceId` (config `home_space_id`, pinned/first space, or a designated "feed"-type space). A true cross-space "Hot/Top" feed and an all-time **`Top`-by-votes** sort do not exist server-side (space lists offer only latest/popular/oldest/newest/unanswered; `votes` sort exists **only** on `/search`). Flag to foundation: Home "Top" currently aliases `popular`. A 1.6.0 `/feed` endpoint would be the clean fix.
2. **Manifest drift vs code** (verify-callee-before-caller): `GET /replies/{id}` (`get_item`) is in the manifest but **not registered** in `Replies_Controller`; `split_reply` (not `split_item`) and `OEmbed::handle` (not `get_oembed`) differ from manifest method names; `DELETE /replies/{id}/accept` (`unaccept_reply`) exists in code but is **absent from the manifest**. Manifest needs a refresh on the replies/oembed rows.
3. **Search rows are raw, not enriched.** `/search` returns bare `jt_posts`/`jt_spaces`/`jt_tags` columns + `type` + (joined) `space_title/space_slug` + `match_score` — NO `author_name`/`author_avatar`/`time_ago`. Render search hits as preview rows and call `getPost(id)` on tap for the full enriched `Post`. The injected `type` key collides with the post's own `type` column in `all` mode — server overwrites the post's `type` with the literal `'post'` (typed in `types/search.ts` as `type_tag`; confirm field name when wiring).
4. **User search is NOT in this domain.** `/search?type=all` returns posts+spaces+**tags** only. The search screen's "Users" tab must call the Users controller (foundation/profile domain), not `/search`.
5. **Auth/media dependencies.** Compose image attach depends on the foundation `media` upload api (returns URL inserted into body). Mod-action button gating depends on capability flags in the foundation `me`/app-config payload. Captcha/rate-limit 400s on create are surfaced by these endpoints — the Composer must render server `message` inline.
6. **Votes return score, not the user's current value.** `VoteResponse` gives `action`+`score` only; the client must track per-object `UserVoteState` (1/-1/0) locally (Zustand slice) to drive button state and compute optimistic deltas. Seed it from list/detail payloads if the foundation `me` ever exposes a user-votes map (it does not today).
