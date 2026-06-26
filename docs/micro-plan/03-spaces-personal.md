# Micro Build Plan — 03 · Spaces, Discovery & Personal Lists

Spaces (CRUD · members · privileged · join/leave · join-requests · invite) · Categories · Subscriptions · Bookmarks · Space feed

Authoritative source: `vapvarun/jetonomy` `audit/manifest.json` (`rest.endpoints`, namespace `jetonomy/v1`) + the
controllers `includes/api/class-spaces-controller.php`, `class-categories-controller.php`,
`class-subscriptions-controller.php`, `class-bookmarks-controller.php` (and the space-feed route in
`class-posts-controller.php`) — read against code on 2026-06-27 (Jetonomy 1.5.x). Every field/shape below was
lifted from the actual controller method (`prepare_*`), not the manifest summary. Disagreements are flagged in
**Cross-Domain Notes**.

## Fixed conventions (inherited — DO NOT redefine)

- From foundation spec 01: `client` (axios, `baseURL = ${siteUrl}/wp-json/jetonomy/v1`, Basic App-Password auth),
  `coreClient`, `configureClients`, `clearClientAuth`, `ApiError`, `toApiError`. **No nonces.** All paths below are
  relative to that baseURL (`client.get('/spaces')` → `…/jetonomy/v1/spaces`).
- Gating: `useFeatures()` from `authStore` (`api/config.ts` `getAppConfig`, 404→defaults). Pro UI gates on `features.*`.
  Nothing in this domain is Pro — but **capability** gating (create-space / manage-categories / space-admin) is heavy here.
- Tab contract: this domain owns **`app/(tabs)/spaces.tsx`**. Home/Notifications/Messages/Profile are siblings.
- Reuse from Content (spec 02): `PostCard`, `types/post.ts` (`Post`), `ListEnvelope<T>`/`ListMeta` (`types/api.ts`),
  pagination params, the response interceptor that throws `ApiError`. Date utils parse UTC w/ `gmt_offset`.

## Response-envelope rules that apply to THIS domain (verified per controller)

| Shape | Endpoints | Notes |
|---|---|---|
| `ListEnvelope<T>` (`{data, meta}`) via `paginated_response` | `GET /spaces`, `GET /spaces/{id}/members`, `GET /spaces/{space_id}/posts`, `GET /categories`, `GET /subscriptions`, `GET /bookmarks` | `meta` = `{count, has_more, cursor_next, total?, offset?}` (foundation `types/api.ts`). |
| **Bare object** | `GET/POST/PATCH /spaces/{id}`, `GET /categories/{id}`, create/update for spaces+categories | NOT wrapped in `data`. |
| **Bare array** (⚠ no envelope) | `GET /spaces/{id}/privileged-members` | `rest_ensure_response($items)` — plain `[]`, no `meta`. |
| `{data, meta:{total}}` (⚠ hand-rolled, not `paginated_response`) | `GET /spaces/{id}/join-requests` | Has `data`+`meta.total` but no `count/has_more/cursor_next`. |
| Ad-hoc action objects | join/leave/role/invite/approve/deny/bookmark-toggle/subscribe | Exact shapes listed per file below. |
| `X-WP-TotalPages` header | `GET /spaces` only | Page count; combine with `meta.total`. |

---

## Types

### `types/space.ts`
```ts
// from prepare_space() in class-spaces-controller.php (lines ~1106-1126)
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
  type: SpaceType;            // server default falls back to admin "default_space_type"
  visibility: SpaceVisibility;
  join_policy: SpaceJoinPolicy;
  icon: string;               // emoji/dashicon token
  cover_image: string;        // URL or ''
  settings: Record<string, unknown>; // decoded JSON object ({} when empty)
  member_count: number;
  post_count: number;
  sort_order: number;
  author_id: number | null;
  created_at: string | null;
  updated_at: string | null;
  last_activity_at: string | null; // ⇒ "Active N ago" recency on SpaceCard
}

// GET /spaces/{id}/members → prepare_member()
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

// GET /spaces/{id}/privileged-members → get_privileged_members() (LEANER shape)
export interface PrivilegedMember {
  user_id: number;
  role: SpaceRole;        // only 'admin' | 'moderator' returned
  display_name: string;
  avatar_url: string;
}

// GET /spaces/{id}/join-requests → get_join_requests()
export interface JoinRequest {
  id: number;
  user_id: number;
  display_name: string;
  avatar_url: string;
  profile_url: string;
  message: string;
  created_at: string;
}

// action responses
export interface JoinResult { status: 'joined'; space_id: number; user_id: number; role: 'member'; } // 201
export interface PendingResult { status: 'pending'; message: string; }                                // 202
export interface LeaveResult { removed: true; space_id: number; user_id: number; }
export interface RoleUpdateResult { updated: true; space_id: number; user_id: number; role: SpaceRole; }
export interface InviteResult { token: string; invite_url: string; max_uses: number; expires_at: string | null; }
export interface UseInviteResult { status: string; space_id: number; space_slug: string; }
export interface JoinRequestActionResult { status: 'approved' | 'denied'; request_id: number; space_id: number; user_id: number; }
```

### `types/category.ts`
```ts
// prepare_category() in class-categories-controller.php
export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent_id: number | null;
  icon: string;
  color: string;            // hex or token
  visibility: SpaceVisibility;
  sort_order: number;
  space_count: number;
  created_at: string | null;
}
// GET /categories nests extras on each top-level node:
export interface CategoryTreeNode extends Category {
  spaces: Space[];          // Space::list_by_category() raw rows (NOT paginated)
  children: CategoryTreeNode[]; // recursive
}
```

### `types/subscription.ts`
```ts
// prepare_subscription() — note `via` maps from DB column `notify_via`
export type SubscriptionObjectType = 'space' | 'post';
export type SubscriptionVia = 'web' | 'email' | 'both';
export interface Subscription {
  id: number;               // row id — the DELETE key (NOT object_id)
  user_id: number;
  object_type: SubscriptionObjectType;
  object_id: number;
  via: SubscriptionVia;
  created_at: string | null;
}
```

### `types/bookmark.ts`
```ts
// GET /bookmarks list items = LEAN post projection (NOT a full Post)
export interface BookmarkItem {
  id: number;               // post id
  title: string;
  slug: string;
  space_id: number;
  vote_score: number;
  reply_count: number;
  bookmarked_at: string | null;
  created_at: string | null;
}
export interface BookmarkToggleResult { bookmarked: boolean; } // POST /bookmarks
```

---

## API layer (one typed fn per endpoint)

### `api/spaces.ts`
`path` — typed wrappers for every space/member/invite endpoint — uses foundation `client`.

- `listSpaces(params?: { category_id?; type?: SpaceType; visibility?: SpaceVisibility; postable_by_me?: boolean; limit?; after?; offset? })`
  → `GET /spaces` → `Spaces_Controller::list_items` → `ListEnvelope<Space>` (+ `X-WP-TotalPages`).
- `getSpace(id)` → `GET /spaces/{id}` → `get_item` → `Space` (bare). 404 / 403 for private+hidden non-members.
- `createSpace(body: Partial<Space> & { title: string })` → `POST /spaces` → `create_item` → `Space` (201).
- `updateSpace(id, patch: Partial<Space>)` → `PATCH /spaces/{id}` → `update_item` → `Space`. (`settings` is **merged** server-side.)
- `deleteSpace(id)` → `DELETE /spaces/{id}` → `delete_item` → `{deleted:true, id}`.
- `getMembers(id, params?)` → `GET /spaces/{id}/members` → `get_members` → `ListEnvelope<SpaceMember>`.
- `getPrivilegedMembers(id, limit=20)` → `GET /spaces/{id}/privileged-members` → `get_privileged_members` → `PrivilegedMember[]` (⚠ bare array).
- `joinSpace(id, message?)` → `POST /spaces/{id}/members` → `join_space` → `JoinResult` (201) | `PendingResult` (202). Handle 403 invite-only, 409 already-member.
- `leaveSpace(id, userId)` → `DELETE /spaces/{id}/members/{user_id}` → `leave_space` → `LeaveResult`. (self = leave; admin = kick.)
- `updateMemberRole(id, userId, role: SpaceRole)` → `PATCH /spaces/{id}/members/{user_id}` → `update_member_role` → `RoleUpdateResult`. Handle 400 self-demote / last-admin.
- `getJoinRequests(id)` → `GET /spaces/{id}/join-requests` → `get_join_requests` → `{data: JoinRequest[]; meta:{total}}`.
- `approveJoinRequest(id, requestId)` → `POST /spaces/{id}/join-requests/{request_id}/approve` → `JoinRequestActionResult`.
- `denyJoinRequest(id, requestId)` → `POST /spaces/{id}/join-requests/{request_id}/deny` → `JoinRequestActionResult`.
- `generateInvite(id, body?: { max_uses?; expires_at? })` → `POST /spaces/{id}/invite` → `generate_invite` → `InviteResult` (201).
- `useInvite(token)` → `GET /invite/{token}` → `use_invite` → `UseInviteResult`. Handle 401 `jetonomy_login_required`.
- `getSpacePosts(spaceId, params?: { sort?: 'latest'|'popular'|'oldest'|'newest'|'unanswered'; limit?; after?; offset? })`
  → `GET /spaces/{space_id}/posts` → `Posts_Controller::list_items` → `ListEnvelope<Post>` (Content's `Post`). ⚠ param is `space_id`.

### `api/categories.ts`
- `listCategories()` → `GET /categories` → `Categories_Controller::list_items` → `ListEnvelope<CategoryTreeNode>` (nested spaces+children, unpaginated).
- `getCategory(id)` → `GET /categories/{id}` → `get_item` → `Category & { spaces: Space[] }`.
- `createCategory(body)` → `POST /categories` → `create_item` → `Category` (201). **Admin-only** (`jetonomy_manage_categories`).
- `updateCategory(id, patch)` → `PATCH /categories/{id}` → `update_item` → `Category`. **Admin-only**.
- `deleteCategory(id)` → `DELETE /categories/{id}` → `delete_item` → `{deleted:true, id}`. **Admin-only**.

### `api/subscriptions.ts`
- `listSubscriptions(params?)` → `GET /subscriptions` → `Subscriptions_Controller::list_items` → `ListEnvelope<Subscription>` (own rows only; handler `require_auth`).
- `createSubscription(body: { object_type: SubscriptionObjectType; object_id: number; via?: SubscriptionVia })`
  → `POST /subscriptions` → `create_item` → `Subscription` (201 new / 200 dup).
- `deleteSubscription(id)` → `DELETE /subscriptions/{id}` → `delete_item` → `{deleted:true, id}`. ⚠ `id` = **subscription row id**, not object_id; ownership enforced (403).

### `api/bookmarks.ts`
- `listBookmarks(params?)` → `GET /bookmarks` → `Bookmarks_Controller::list_items` → `ListEnvelope<BookmarkItem>`.
- `toggleBookmark(post_id)` → `POST /bookmarks` (body `{post_id}`) → `toggle_item` → `BookmarkToggleResult` (200, `{bookmarked}` only — no count).
- `removeBookmark(post_id)` → `DELETE /bookmarks/{post_id}` → `delete_item` → `{deleted:true, post_id}`.

---

## Hooks (React Query)

### `hooks/useSpaces.ts`
- `useSpaceList(params)` — `useInfiniteQuery`, key `['spaces', params]`, `getNextPageParam` from `meta.cursor_next`/`offset`.
- `useSpace(id)` — `useQuery ['space', id]`. `enabled: !!id`.
- `useSpacePosts(spaceId, sort)` — `useInfiniteQuery ['space-posts', spaceId, sort]` → renders `PostCard`.
- `useSpaceMembers(id)`, `useSpacePrivilegedMembers(id)` — separate keys (lean vs full).
- `useCategories()` — `useQuery ['categories']`, `staleTime` long (changes rarely).
- Mutations: `useJoinSpace`, `useLeaveSpace`, `useUpdateMemberRole`, `useCreateSpace`, `useUpdateSpace`, `useDeleteSpace`,
  `useGenerateInvite`, `useUseInvite`, `useJoinRequests`/`useApproveJoinRequest`/`useDenyJoinRequest`.
  - Concurrency: on 409 already-member / 404 not-member / 400 last-admin → invalidate `['space', id]`+`['space-members', id]` and surface the server message (multi-actor: already-joined / already-removed).
  - `useJoinSpace`: branch on 201 (`joined` → optimistic member badge) vs 202 (`pending` → show "Awaiting approval", do NOT mark joined).

### `hooks/useSubscriptions.ts`
- `useSubscriptions()` — list.
- `useToggleSubscription(object_type, object_id)` — **optimistic**: derive current sub by matching `object_type`+`object_id` in the list cache; subscribe = `createSubscription`, unsubscribe = `deleteSubscription(sub.id)` (must resolve row id from cache first). Rollback list cache on error.

### `hooks/useBookmarks.ts`
- `useBookmarks()` — infinite list.
- `useToggleBookmark(post_id)` — **optimistic**: flip `bookmarked` in any post/PostCard cache immediately; reconcile with `{bookmarked}` response; on error rollback. Also invalidate `['bookmarks']` list on settle.

---

## Screens & Components

### `app/(tabs)/spaces.tsx` — Discovery hub
Responsibility: categories + spaces grouped, with search. — `useCategories()` (grouped headers) +
`useSpaceList({ category_id })` per section OR flat `useSpaceList` with client search box (`search` param if added; else filter
title client-side over the page). Endpoints: `GET /categories` (`list_items`), `GET /spaces` (`list_items`).
States: loading skeleton, empty ("No spaces yet"), error (retry), end-of-list. Gating: shows **Create Space** FAB only when
`me.capabilities` allows (see Cross-Domain). RTL/dark/40px tap targets per foundation.

### `app/space/[id].tsx` — Space feed
Responsibility: space header (icon, title, member_count, "Active N ago" from `last_activity_at`) + feed reusing Content `PostCard`
+ Join/Leave + Subscribe. Endpoints: `GET /spaces/{id}` (`get_item`), `GET /spaces/{space_id}/posts` (`Posts_Controller::list_items`).
States: loading, **403 gate** for private/hidden non-members → "This space is private. Request to join."; empty feed; error.
Gating: Join button reads `join_policy` (`open`→join, `approval`→request, `invite`→disabled "Invite only").

### `app/space/[id]/members.tsx`
Responsibility: full member list + "Managed by" privileged strip. Endpoints: `GET /spaces/{id}/members` (`get_members`),
`GET /spaces/{id}/privileged-members` (`get_privileged_members`). Space-admin-only inline role editor + kick
(`updateMemberRole`, `leaveSpace`). Also surfaces pending **join-requests** to privileged viewers
(`getJoinRequests`/approve/deny). States: 403 for private non-members; empty; per-row action loading/disabled.

### `app/space/[id]/invite.tsx`
Responsibility: (a) admin generates an invite link (`generateInvite`, shows `invite_url`/`token`, share sheet);
(b) accept-token flow (`useInvite(token)` from deep link `…/invite/{token}`). Endpoints: `POST /spaces/{id}/invite`,
`GET /invite/{token}`. States: 401 login-required (route to auth, preserve token), success → navigate to `space/{space_id}`,
already-member/expired error. Gating: generate panel admin-only.

### `app/bookmarks.tsx`
Responsibility: current user's bookmarked posts (lean rows → tap to open post). `useBookmarks()` infinite list,
`BookmarkButton` per row (optimistic remove). Endpoints: `GET /bookmarks`, `DELETE /bookmarks/{post_id}`.
States: login-required, empty ("No bookmarks"), loading, error.

### `app/subscriptions.tsx`
Responsibility: list of subscribed spaces/posts with `via` chip + unsubscribe. `useSubscriptions()` +
`SubscribeToggle`. Endpoints: `GET /subscriptions`, `DELETE /subscriptions/{id}`. States: login-required, empty, error.

### Components
- `SpaceCard` — icon/cover, title, `member_count`, `post_count`, and **"Active N ago"** from `last_activity_at` (hide if null). Tap → `space/[id]`.
- `CategoryHeader` — name + `color` accent + `space_count`; collapsible section header.
- `MemberRow` — avatar, display_name, role badge, trust/reputation; admin action menu (role/kick) when viewer is space admin.
- `JoinLeaveButton` — state machine off `join_policy` + membership (membership derived — see gotcha): Join / Request / Pending / Leave / Invite-only(disabled).
- `SubscribeToggle` — bell icon; optimistic via `useToggleSubscription`; `via` defaults `both`.
- `BookmarkButton` — optimistic via `useToggleBookmark`; reused inside Content `PostCard` too.

---

## Capability / privacy gating (must honor)

- **Create space**: server cap matrix (`manage_options` OR `jetonomy_create_spaces` OR an admin-allowlisted WP role). The app can't
  compute this — read a capability flag from `me`/app-config (foundation `Me.capabilities`); hide the Create FAB otherwise. On miss → 401/403.
- **Manage categories** (`jetonomy_manage_categories`): create/update/delete categories are **admin-only**; ship as typed fns but no member UI (admin seam).
- **Space admin** (`is_space_admin`): gates `updateSpace`, `deleteSpace`, `generateInvite`, role edits, kicks. **Space privileged** (admin OR moderator):
  gates join-request list/approve/deny. Derive from `getMembers`/`getPrivilegedMembers` (current user's `role`) or app-config; always handle server 403 as source of truth.
- **Private / hidden spaces**: `GET /spaces/{id}`, `/members`, `/posts` return **403** for non-members (visibility ∈ `private|hidden`).
  Render the "request to join" gate, not an error toast. `hidden` also implies non-discoverable — only reachable via direct link/invite.

---

## COVERAGE TABLE (every spaces/categories/subscriptions/bookmarks + space-feed endpoint)

| # | METHOD route | Controller method | api fn | Notes |
|---|---|---|---|---|
| 1 | GET `/spaces` | `Spaces_Controller::list_items` | `spaces.listSpaces` | filters category_id/type/visibility/postable_by_me |
| 2 | POST `/spaces` | `::create_item` | `spaces.createSpace` | cap-gated |
| 3 | GET `/spaces/{id}` | `::get_item` | `spaces.getSpace` | 403 private/hidden |
| 4 | PATCH `/spaces/{id}` | `::update_item` | `spaces.updateSpace` | space-admin; settings merged |
| 5 | DELETE `/spaces/{id}` | `::delete_item` | `spaces.deleteSpace` | space-admin |
| 6 | GET `/spaces/{id}/members` | `::get_members` | `spaces.getMembers` | 403 private/hidden |
| 7 | POST `/spaces/{id}/members` | `::join_space` | `spaces.joinSpace` | 201 joined / 202 pending / 403 invite / 409 dup |
| 8 | GET `/spaces/{id}/privileged-members` | `::get_privileged_members` | `spaces.getPrivilegedMembers` | ⚠ bare array |
| 9 | GET `/spaces/{id}/join-requests` | `::get_join_requests` | `spaces.getJoinRequests` | privileged; `{data,meta.total}` |
| 10 | POST `/spaces/{id}/join-requests/{request_id}/approve` | `::approve_join_request` | `spaces.approveJoinRequest` | privileged |
| 11 | POST `/spaces/{id}/join-requests/{request_id}/deny` | `::deny_join_request` | `spaces.denyJoinRequest` | privileged |
| 12 | PATCH `/spaces/{id}/members/{user_id}` | `::update_member_role` | `spaces.updateMemberRole` | space-admin; 400 self-demote/last-admin |
| 13 | DELETE `/spaces/{id}/members/{user_id}` | `::leave_space` | `spaces.leaveSpace` | self or admin |
| 14 | POST `/spaces/{id}/invite` | `::generate_invite` | `spaces.generateInvite` | space-admin |
| 15 | GET `/invite/{token}` | `::use_invite` | `spaces.useInvite` | 401 login-required |
| 16 | GET `/spaces/{space_id}/posts` | `Posts_Controller::list_items` | `spaces.getSpacePosts` | reuses Content `Post`/`PostCard`; param `space_id` |
| 17 | GET `/subscriptions` | `Subscriptions_Controller::list_items` | `subscriptions.listSubscriptions` | own rows |
| 18 | POST `/subscriptions` | `::create_item` | `subscriptions.createSubscription` | space|post; via |
| 19 | DELETE `/subscriptions/{id}` | `::delete_item` | `subscriptions.deleteSubscription` | id = row id |
| 20 | GET `/categories` | `Categories_Controller::list_items` | `categories.listCategories` | nested spaces+children |
| 21 | GET `/categories/{id}` | `::get_item` | `categories.getCategory` | +spaces |
| 22 | POST `/categories` | `::create_item` | `categories.createCategory` | admin-only seam |
| 23 | PATCH `/categories/{id}` | `::update_item` | `categories.updateCategory` | admin-only seam |
| 24 | DELETE `/categories/{id}` | `::delete_item` | `categories.deleteCategory` | admin-only seam |
| 25 | GET `/bookmarks` | `Bookmarks_Controller::list_items` | `bookmarks.listBookmarks` | lean post rows |
| 26 | POST `/bookmarks` | `::toggle_item` | `bookmarks.toggleBookmark` | `{bookmarked}` |
| 27 | DELETE `/bookmarks/{post_id}` | `::delete_item` | `bookmarks.removeBookmark` | by post_id |
| — | GET `/spaces/{id}/moderation/flags` (+resolve, +approve/spam/trash) | `Space_Moderation_Controller` | **n/a** | Out of scope → Moderation domain spec (not this file). |

**27 / 27 in-scope endpoints mapped.** (3 `/spaces/{id}/moderation/*` routes are out of scope — owned by the Moderation spec.)

---

## Cross-Domain Notes (gotchas)

1. **No membership flag on the Space object.** `prepare_space()` returns **no** `is_member`/`viewer_role`/`is_subscribed`.
   `JoinLeaveButton`/`SubscribeToggle` must derive state from `getMembers` (find current `user_id`) or from a join attempt
   (409 = already member), and from the subscriptions list. Plan a small `useMyMembership(spaceId)` selector; never assume from `GET /spaces/{id}`.
2. **Privileged-members is a bare array; join-requests is `{data,meta.total}`.** Both differ from the standard `ListEnvelope`.
   Do not pipe them through the generic infinite-list unwrap — give them dedicated parsers.
3. **Subscriptions DELETE keys on row `id`, not `object_id`.** To unsubscribe a space you must first resolve the subscription
   row id from the list cache. `via` is exposed as `via` but stored as `notify_via` — read `via` only.
4. **Bookmarks list ≠ Post.** `GET /bookmarks` returns a lean projection (`BookmarkItem`), not the full Content `Post`. Don't feed it
   straight into `PostCard` expecting author/body — tap-through must `getPost(id)` (Content domain) for the full view. `POST /bookmarks`
   returns only `{bookmarked}` (no counts) — keep any "N bookmarks" tally client-side or refetch.
5. **Private vs hidden.** Both 403 to non-members on get/members/posts. `hidden` is additionally non-discoverable (excluded from
   `GET /spaces` for non-members in SQL) — surface it only via invite/deep-link; never show a "hidden" filter chip to members.
6. **Categories tree is unpaginated and embeds spaces.** `GET /categories` eager-loads every top-level category + nested children +
   `Space::list_by_category` rows. At extreme scale this is heavy — cache hard (`staleTime`), and on big communities prefer
   `GET /spaces?category_id=` for the actual space grid rather than the embedded `spaces[]`.
7. **`postable_by_me=true`** returns only spaces the user is a member of AND can post in (logged-out → `[]`). Use it to populate the
   Compose-screen space picker (Content domain consumes this) — don't re-implement membership filtering client-side.
8. **Invite deep link** arrives as `…/{base_slug}/invite/{token}/` (web) — the app must register a deep-link route mapping to
   `app/space/[id]/invite.tsx` carrying the token, then call `useInvite`. 401 → send to auth, retain token, retry post-login.
9. **Join 202 ≠ joined.** `approval` policy returns 202 `pending`; UI must show "Awaiting approval" and NOT optimistically add the
   member or flip to Leave. Only 201 `joined` flips state.
