# Micro Build Plan — 04 · People + Notifications + Profile

Users/Profiles · Notifications · Leaderboards · Pro profile add-ons (Custom Fields on profile · Custom Badges on profile)

Authoritative source: `vapvarun/jetonomy` `audit/manifest.json` (rest.endpoints) + `jetonomy-pro` `audit/manifest.json`
(custom-fields, custom-badges slices). Every contract below was lifted from the actual controller method
(`jetonomy/includes/api/class-{users,notifications,leaderboards}-controller.php`,
`jetonomy-pro/includes/extensions/custom-fields/class-extension.php`,
`…/custom-badges/class-extension.php`) on 2026-06-27 (Jetonomy 1.5.x line), not from the manifest summary.
Where the two disagree it is flagged in **Cross-Domain Notes**.

## Fixed conventions (inherited from foundation 01 + shared with 02)

- Expo SDK 52 + TS, expo-router (`app/`), Zustand (`stores/`), React Query (`hooks/`), axios (`api/`), NativeWind.
- `client`/`coreClient` from `api/client.ts` (foundation). `client` baseURL = `${siteUrl}/wp-json/jetonomy/v1`; WP
  Application-Password **Basic auth** attached by foundation — no nonces. **Never** redefine auth/baseURL here. All paths
  below are relative to that baseURL. Pro field/badge routes are ALSO on `jetonomy/v1` (extensions register under the free
  namespace), so they use the same `client` — not a separate Pro client.
- Errors: WP REST envelope `{ code, message, data:{ status } }` → foundation interceptor throws `ApiError`
  (`.status`/`.code`/`.message`); use `toApiError(err)` in catch blocks.
- **Gating** via `useFeatures()`: `features.custom_fields` and `features.badges` are **Pro**. Free
  notifications + leaderboards + profile are **always on**. Pro surfaces render null (not an error) when the flag is false.
- `types/user.ts` (foundation) owns `Me` / `PublicUser` / `UserSuggestion` — **EXTEND, do not duplicate**. Content domain
  (02) owns `PostCard` + `api/posts.ts` `getUserPosts`; "My Posts"/profile-posts here **reuse** them, not re-declare.

## Shared response envelopes (exact, from source)

```ts
// Single objects (users/me, users/{id}) → BARE object, not wrapped.
// Lists that go through Base_Controller::paginated_response (leaderboards, users/{id}/posts) → ListEnvelope<T> (see 02).
// Pro endpoints wrap in { data: T[] } WITHOUT meta:
//   GET /users/{id}/fields  → { data: Record<slug, FieldValue> }   (object keyed by slug, NOT an array)
//   GET /users/{id}/badges  → { data: UserBadge[] }
//   GET /fields             → { data: FieldDef[] }  (rest_list_fields)
//   GET /badges             → paginated (page/per_page) — confirm wrapper in list_badges at build time
```

---

## api/ — endpoint clients

### `api/users.ts` — user/profile data access (free)
- responsibility — current user, public profiles, profile posts, mention suggest, profile update. All via `client`.
- endpoints:
  - `getMe()` → `GET /users/me` → `Users:get_current_user` → `Me`
  - `updateMe(body)` → `PATCH /users/me` → `Users:update_current_user` → `Me` (body = `UpdateMeInput`)
  - `getUser(id)` → `GET /users/(id)` → `Users:get_item` → `PublicUser`
  - `getUserByLogin(login)` → `GET /users/by-login/(login)` → `Users:get_by_login` → `PublicUser`
  - `getUserPosts(id, params)` → `GET /users/(id)/posts` → `Users:get_user_posts` → `ListEnvelope<PostCard>` **(reuse 02's `PostCard`)**
  - `suggestUsers(q, space_id?)` → `GET /users/suggest` → `Users:suggest` → `UserSuggestion[]` (bare array; q ≥ 2 chars else `[]`)
- TS types — `Me`, `PublicUser`, `UserSuggestion`, `UpdateMeInput` (all `types/user.ts`).
- gating — none (free).

### `api/notifications.ts` — notification feed + unread (free)
- responsibility — list/filter, single mark-read, single dismiss, bulk, mark-all-read, unread count.
- endpoints:
  - `listNotifications({filter,limit,offset})` → `GET /notifications` → `Notifications:list_items` → `ListEnvelope<NotificationItem>`. `filter ∈ all|unread|mentions|replies|votes|badges`.
  - `unreadCount()` → `GET /notifications/unread-count` → `Notifications:unread_count` → `{ count:number }`
  - `markRead(id)` → `PATCH /notifications/(id)` → `Notifications:mark_read` → bare `NotificationItem`
  - `dismiss(id)` → `DELETE /notifications/(id)` → `Notifications:delete_notification` → `{ deleted:true }`
  - `markAllRead()` → `POST /notifications/mark-all-read` → `Notifications:mark_all_read` → `{ updated:number }`
  - `bulk({action,ids})` → `POST /notifications/bulk` → `Notifications:bulk_action`. `action ∈ mark_read|delete`, `ids:number[]`.
- TS types — `NotificationItem`, `NotificationFilter`, `BulkAction` (`types/notification.ts`).
- gating — none (free).

### `api/leaderboards.ts` — ranked members (free)
- responsibility — reputation leaderboard with period + paging.
- endpoints:
  - `getLeaderboard({period,limit,offset})` → `GET /leaderboards` → `Leaderboards:list_items` → `ListEnvelope<LeaderRow>`. `period ∈ all|month|week` (default `all`), `limit` 1–100 (default 20).
- TS types — `LeaderRow`, `LeaderboardPeriod` (`types/leaderboard.ts`).
- gating — none (free).

### `api/fields.ts` — custom profile/post fields **[PRO]**
- responsibility — field definitions + per-user/per-post values. Member app uses the **read + own-write** subset; admin CRUD is typed but unused on mobile.
- endpoints:
  - `listFields({context,space_id})` → `GET /fields` → `Custom_Fields:rest_list_fields` → `{ data: FieldDef[] }`
  - `getUserFields(id)` → `GET /users/(id)/fields` → `Custom_Fields:rest_get_user_fields` → `{ data: Record<slug, FieldValue> }`
  - `updateMyFields(values)` → `PATCH /users/me/fields` → `Custom_Fields:rest_update_my_fields` → updated values. **This is the only profile-field write the member app calls.**
  - `getPostFields(postId)` → `GET /posts/(id)/fields` → `Custom_Fields:rest_get_post_fields` → `{ data: Record<slug,FieldValue> }` — **owned by Content (02) composer**; export here, Content imports.
  - `updatePostFields(postId, values)` → `PATCH /posts/(id)/fields` → `Custom_Fields:rest_update_post_fields` — **Content (02) compose flow**; export-only here.
  - admin CRUD (typed seams, NOT wired to UI): `createField` `POST /fields`, `updateField` `PATCH /fields/(id)`, `deleteField` `DELETE /fields/(id)` — all `auth_mutation('manage_options')`.
- TS types — `FieldDef`, `FieldValue` (`types/customField.ts`).
- gating — `features.custom_fields`. Module imported lazily; never called when flag false.

### `api/badges.ts` — custom badges **[PRO]**
- responsibility — badge catalog + per-user earned badges. Award/CRUD typed but admin-only.
- endpoints:
  - `listBadges({page,per_page})` → `GET /badges` → `Custom_Badges:list_badges` → paged `Badge[]`
  - `getBadge(id)` → `GET /badges/(id)` → `Custom_Badges:get_badge` → `Badge`
  - `getUserBadges(id)` → `GET /users/(id)/badges` → `Custom_Badges:get_user_badges` → `{ data: UserBadge[] }` (badge + `earned_at` + `metadata`)
  - admin (typed seams, NOT wired): `awardBadge` `POST /badges/(id)/award` (`{user_id}`, `manage_options`), `createBadge` `POST /badges`, `updateBadge` `PATCH /badges/(id)`, `deleteBadge` `DELETE /badges/(id)`.
- TS types — `Badge`, `UserBadge` (`types/badge.ts`).
- gating — `features.badges`.

---

## types/ — shape definitions

### `types/user.ts` (EXTEND foundation — add the missing fields, do not redefine)
```ts
// Me (GET /users/me) — prepare_profile + extra keys merged server-side:
export interface Me {
  id: number; user_id: number;
  display_name: string; email: string;
  reputation: number; post_count: number; reply_count: number;
  trust_level: number; trust_level_name: string;
  bio: string | null; avatar_url: string | null;
  last_seen_at: string | null; created_at: string | null; updated_at: string | null;
  spaces_joined_count: number;
  settings: Record<string, unknown>;       // UserProfile::get_settings
  email_opt_out: boolean;
}
// PublicUser (GET /users/{id} | by-login) — narrower, no email/settings:
export interface PublicUser {
  id: number; display_name: string;
  trust_level: number; trust_level_name: string;
  reputation: number; post_count: number; reply_count: number;
  bio: string | null; avatar_url: string | null;
  created_at: string | null; last_seen_at: string | null;
  // Pro enrich (jetonomy_profile_response filter may append): badges?, fields? — keep optional.
}
export interface UserSuggestion { id: number; login: string; display_name: string; avatar_url: string; }
export interface UpdateMeInput { display_name?: string; bio?: string; avatar_url?: string; settings?: Record<string,unknown>; email_opt_out?: boolean; }
```

### `types/notification.ts`
```ts
export type NotificationFilter = 'all'|'unread'|'mentions'|'replies'|'votes'|'badges';
export type NotificationObjectType = 'post'|'reply'|'badge'|'user'|null;
export interface NotificationItem {
  id: number; user_id: number; type: string;
  object_type: NotificationObjectType; object_id: number|null;
  actor_id: number|null; is_read: boolean; created_at: string|null;
  message: string; actor_name: string; actor_avatar: string; actor_login: string;
  time_ago: string; profile_url: string; object_url: string;  // object_url = WEB url; app maps via object_type+object_id (see deep-link note)
}
export type BulkAction = 'mark_read'|'delete';
```

### `types/leaderboard.ts`
```ts
export type LeaderboardPeriod = 'all'|'month'|'week';
export interface LeaderRow {
  rank: number; user_id: number; display_name: string; user_login: string;
  avatar_url: string; profile_url: string;
  reputation: number; post_count: number; reply_count: number; trust_level: number;
}
```

### `types/customField.ts` **[PRO]**
```ts
export interface FieldDef {
  id: number; name: string; slug: string; field_type: string;  // text|textarea|select|url|...
  context: string; description: string|null; placeholder: string|null;
  options: string[]|Record<string,string>; default_value: string|null;
  is_required: boolean; is_searchable: boolean; is_filterable: boolean;
  space_id: number|null; sort_order: number;
}
// values are keyed by slug:  Record<slug, FieldValue>
export interface FieldValue { name: string; type: string; value: string|null; options: unknown[]; }
```

### `types/badge.ts` **[PRO]**
```ts
export interface Badge {
  id: number; name: string; slug: string; description: string; icon: string;  // icon = Lucide name
  tier: string; category: string; criteria: unknown;
  reputation_bonus: number; is_repeatable: boolean; is_active: boolean;
  earned_count: number; created_at: string|null;
}
export interface UserBadge extends Badge { earned_at: string; metadata: Record<string,unknown>|null; }
```

---

## hooks/ — React Query

### `hooks/useNotifications.ts`
- `useNotifications(filter)` — `useInfiniteQuery(['notifications',filter])` → `api.listNotifications`, offset paging from `meta`.
- `useUnreadCount()` — `useQuery(['notifications','unread'])` → `api.unreadCount`, **`refetchInterval: 30_000`** (poll) + `refetchOnAppForeground`. Feeds the tab badge in `notifications.tsx` options.
- `useMarkRead()` / `useDismiss()` / `useMarkAllRead()` / `useBulk()` — mutations; **optimistic** is_read flip + invalidate `['notifications']` and `['notifications','unread']`. Multi-actor: treat 404 on a row (already deleted/read elsewhere) as success, drop the row.

### `hooks/useProfile.ts`
- `useMe()` — `useQuery(['me'])` → `api.getMe`; seeds settings/email_opt_out for edit + settings screens.
- `useUser(id)` — `useQuery(['user',id])` → `getUser`; `useUserByLogin(login)` variant.
- `useUserPosts(id)` — `useInfiniteQuery(['user',id,'posts'])` → `api.getUserPosts` (02's client).
- `useUpdateMe()` — mutation `PATCH /users/me`, invalidate `['me']`.
- **[PRO]** `useUserFields(id)` (gated `features.custom_fields`) → `getUserFields`; `useUpdateMyFields()` → `updateMyFields`.
- **[PRO]** `useUserBadges(id)` (gated `features.badges`) → `getUserBadges`; `useBadgeCatalog()` → `listBadges`.

### `hooks/useLeaderboard.ts`
- `useLeaderboard(period)` — `useInfiniteQuery(['leaderboard',period])` → `api.getLeaderboard`, offset paging from `meta`. `period` from a segmented control.

---

## components/

- `NotificationItem` — actor avatar + `message`/`time_ago`, unread dot, swipe-to-dismiss, tap → deep-link (see note). Read state dims. Icon per `type` (Lucide). a11y: `<Pressable accessibilityRole="button">`, label = message.
- `UserHeader` — avatar, `display_name`, `@user_login`, `TrustLevelBadge`, rep + `StatPills`. Used by `profile.tsx` and `user/[id].tsx`.
- `TrustLevelBadge` — maps `trust_level`/`trust_level_name` → colored chip (token colors, dark-mode safe).
- `StatPills` — reputation / post_count / reply_count pills; tap rep → leaderboard.
- `BadgeList` **[PRO]** — grid of `Badge` icons (Lucide `icon`), tier color, `earned_at` tooltip; empty state "No badges yet". Renders null when `!features.badges`.
- `CustomFieldList` **[PRO]** — renders `Record<slug,FieldValue>` as label/value rows; skips empty values. Null when `!features.custom_fields`.
- `LeaderboardRow` — `rank` (#1–3 medal), avatar, name, rep, trust chip; current user highlighted.

---

## app/ — screens

### `app/(tabs)/notifications.tsx` **(YOURS — tab)**
- responsibility — notification feed: filter chips (all/unread/mentions/replies/votes/badges), mark-all-read, multi-select bulk (mark_read/delete), pull-to-refresh, infinite scroll, tap → deep-link.
- endpoints — `GET /notifications` (`list_items`), `POST /notifications/mark-all-read` (`mark_all_read`), `POST /notifications/bulk` (`bulk_action`), `PATCH /notifications/(id)` (`mark_read`), `DELETE /notifications/(id)` (`delete_notification`), `GET /notifications/unread-count` (`unread_count`, for the tab badge via `useUnreadCount`).
- TS — `NotificationItem`, `NotificationFilter`, `BulkAction`.
- states — loading (skeleton rows) / empty ("You're all caught up") / error (retry) / per-row optimistic / bulk-selection bar.
- gating — free (always on).
- **deep-link** (from notification JSON `object_type` + `object_id`; `object_url` is a WEB url, do NOT navigate to it):
  - `post` → `router.push('/post/'+object_id)` (Content 02)
  - `reply` → `router.push('/post/'+<parent>?reply='+object_id)` — `object_id` is the reply id; parent post resolved by the post screen (web url anchors `#reply-{id}`).
  - `badge` → `router.push('/(tabs)/profile')` (own badges)
  - `user`/mention without post context → `router.push('/user/'+actor_id)`

### `app/(tabs)/profile.tsx` **(YOURS — tab, current user)**
- responsibility — own profile: `UserHeader`, trust level/rep, post/reply counts, `BadgeList`[pro], `CustomFieldList`[pro], segmented tabs **My Posts / Bookmarks**, links to Edit Profile, Settings, Logout.
- endpoints — `GET /users/me` (`get_current_user`); My Posts → `GET /users/(me.id)/posts` (`get_user_posts`, 02's `PostCard`); Bookmarks → **02's `api/bookmarks` `GET /bookmarks`** (cross-domain, do not re-impl); `GET /users/me/badges`→ uses `GET /users/(id)/badges` with `me.id` [pro]; `GET /users/me/fields`→ `GET /users/(id)/fields` with `me.id` [pro].
- TS — `Me`, `PostCard`(02), `UserBadge`[pro], `FieldValue`[pro].
- states — loading / empty per tab / error; logout calls `clearClientAuth()` (foundation) then `router.replace('/login')`.
- gating — free shell; badges/fields sections gated on `features.badges`/`features.custom_fields`.

### `app/user/[id].tsx` **(public profile)**
- responsibility — read-only public profile of another member.
- endpoints — `GET /users/(id)` (`get_item`) [or `GET /users/by-login/(login)` when routed by handle], `GET /users/(id)/posts` (`get_user_posts`), `GET /users/(id)/badges` (`get_user_badges`)[pro], `GET /users/(id)/fields` (`rest_get_user_fields`)[pro].
- TS — `PublicUser`, `PostCard`(02), `UserBadge`[pro], `FieldValue`[pro].
- states — loading / 404 ("User not found") / error / empty posts; respects server `Visibility::rest_check` (403 → "Profile is private").
- gating — free shell; pro sections gated.

### `app/(tabs)/leaderboard.tsx`
- responsibility — ranked members; period segmented control (All / Month / Week), infinite scroll, tap row → `user/[id]`.
- endpoints — `GET /leaderboards` (`list_items`).
- TS — `LeaderRow`, `LeaderboardPeriod`.
- states — loading skeleton / empty ("No ranked members yet") / error.
- gating — free.

### `app/edit-profile.tsx`
- responsibility — edit own `display_name`, `bio`, `avatar_url`, `email_opt_out`; pro custom-field inputs.
- endpoints — `PATCH /users/me` (`update_current_user`); `PATCH /users/me/fields` (`rest_update_my_fields`)[pro]. Field defs for the form via `GET /fields?context=user` (`rest_list_fields`)[pro].
- TS — `UpdateMeInput`, `FieldDef`[pro].
- states — form / saving / validation error (server `args` enforce types) / success toast → back.
- gating — free shell; field block gated on `features.custom_fields`.

### `app/settings.tsx`
- responsibility — dark-mode toggle (local), email/notification prefs, digest preferences[pro seam], logout.
- endpoints — notification/email prefs persist via `PATCH /users/me` `settings` + `email_opt_out` (`update_current_user`). No dedicated digest endpoint in manifest → digest UI is a **typed Pro seam only** until one exists.
- TS — `Me['settings']`, `email_opt_out`.
- states — toggles reflect `useMe`; logout → `clearClientAuth()` → `/login`.
- gating — free shell; digest row gated `features.*` + hidden (no endpoint).

---

## Coverage table — every manifest endpoint → file/fn

| # | Method + path | Controller:method | App file / fn | Notes |
|---|---|---|---|---|
| 1 | GET /users/me | Users:get_current_user | api/users.ts `getMe`; profile/settings/edit | |
| 2 | PATCH /users/me | Users:update_current_user | api/users.ts `updateMe`; edit-profile/settings | |
| 3 | GET /users/(id) | Users:get_item | api/users.ts `getUser`; user/[id] | |
| 4 | GET /users/by-login/(login) | Users:get_by_login | api/users.ts `getUserByLogin` | handle-routed profiles |
| 5 | GET /users/(id)/posts | Users:get_user_posts | api/users.ts `getUserPosts`; profile My Posts + user/[id] | returns 02 `PostCard` |
| 6 | GET /users/suggest | Users:suggest | api/users.ts `suggestUsers` | mention typeahead — **consumed by Content 02 composer**, exported here |
| 7 | GET /notifications | Notifications:list_items | api/notifications.ts `listNotifications`; notifications.tsx | |
| 8 | GET /notifications/unread-count | Notifications:unread_count | api/notifications.ts `unreadCount`; useUnreadCount → tab badge | |
| 9 | POST /notifications/mark-all-read | Notifications:mark_all_read | api/notifications.ts `markAllRead` | |
| 10 | POST /notifications/bulk | Notifications:bulk_action | api/notifications.ts `bulk` | mark_read \| delete |
| 11 | PATCH /notifications/(id) | Notifications:mark_read | api/notifications.ts `markRead` | |
| 12 | DELETE /notifications/(id) | Notifications:delete_notification | api/notifications.ts `dismiss` | |
| 13 | GET /leaderboards | Leaderboards:list_items | api/leaderboards.ts `getLeaderboard`; leaderboard.tsx | |
| 14 | GET /fields | Custom_Fields:rest_list_fields | api/fields.ts `listFields`; edit-profile form [pro] | |
| 15 | POST /fields | Custom_Fields:create | api/fields.ts `createField` | **typed seam, admin-only — n/a member UI** |
| 16 | PATCH /fields/(id) | Custom_Fields:update | api/fields.ts `updateField` | typed seam, admin-only |
| 17 | DELETE /fields/(id) | Custom_Fields:delete | api/fields.ts `deleteField` | typed seam, admin-only |
| 18 | GET /posts/(id)/fields | Custom_Fields:rest_get_post_fields | api/fields.ts `getPostFields` | **Content 02 surface** — exported here, consumed by post detail/compose |
| 19 | PATCH /posts/(id)/fields | Custom_Fields:rest_update_post_fields | api/fields.ts `updatePostFields` | **Content 02 compose** — export-only here |
| 20 | GET /users/(id)/fields | Custom_Fields:rest_get_user_fields | api/fields.ts `getUserFields`; profile + user/[id] [pro] | |
| 21 | PATCH /users/me/fields | Custom_Fields:rest_update_my_fields | api/fields.ts `updateMyFields`; edit-profile [pro] | |
| 22 | GET /badges | Custom_Badges:list_badges | api/badges.ts `listBadges`; edit/award seam [pro] | |
| 23 | POST /badges | Custom_Badges:create_badge | api/badges.ts `createBadge` | typed seam, admin-only |
| 24 | GET /badges/(id) | Custom_Badges:get_badge | api/badges.ts `getBadge` | badge detail [pro] |
| 25 | PATCH /badges/(id) | Custom_Badges:update_badge | api/badges.ts `updateBadge` | typed seam, admin-only |
| 26 | DELETE /badges/(id) | Custom_Badges:delete_badge | api/badges.ts `deleteBadge` | typed seam, admin-only |
| 27 | GET /users/(id)/badges | Custom_Badges:get_user_badges | api/badges.ts `getUserBadges`; profile + user/[id] [pro] | |
| 28 | POST /badges/(id)/award | Custom_Badges:manual_award | api/badges.ts `awardBadge` | typed seam, admin-only (`manage_options`) |

**28/28 endpoints mapped** (20 wired to member UI; 8 admin-only mutations typed as seams in api/ but intentionally not surfaced in the member app — site-owner actions, out of mobile scope).

---

## Cross-Domain Notes

- **Bookmarks tab** in `profile.tsx` is owned by Content domain (02) `api/bookmarks` (`GET /bookmarks`). Do NOT re-implement — import the hook from 02.
- **My Posts / profile posts** reuse 02's `PostCard` + list rendering. `getUserPosts` lives in `api/users.ts` but returns the same `Post`/`PostCard` shape; share the card component.
- **`GET /users/suggest`** physically lives in this domain's `api/users.ts`, but its only consumer is the Content (02) **mention composer** — export it; 02 imports. Flagged so the two plans don't both build a suggest client.
- **Post custom-fields (#18/#19)** are a Pro Content surface (composer + post detail), not a People surface. `api/fields.ts` exports them for 02 to consume; this domain only *owns* the user-field reads/writes (#14, #20, #21).
- **`me.id` reuse**: there are no `/users/me/badges` or `/users/me/fields` GET routes — fetch own badges/fields by passing `me.id` into `GET /users/(id)/badges` and `/users/(id)/fields`. Only the **write** is `me`-scoped (`PATCH /users/me/fields`).
- **Notification `object_url`** is a server-rendered WEB url (`/s/{space}/t/{post}/…`, `/u/{login}/`). The app must NOT WebView it — map `object_type`+`object_id` to native routes (see deep-link block). Web url retained only as a share/fallback.
- **No digest endpoint exists** in either manifest — `settings.tsx` digest-preferences is a typed Pro seam only; do not invent a route. Email/notification prefs persist through `PATCH /users/me` `settings` + `email_opt_out`.
- **Admin gates**: field/badge CRUD + manual award require `auth_mutation('manage_options')` server-side. Even on Pro, a normal member's Basic-auth user lacks the cap → these stay seams; surfacing them would only yield 403s.
- **Pro namespace**: custom-fields/custom-badges register on `jetonomy/v1` (free namespace), so all Pro calls here use foundation's `client`, not a separate base. The Pro/free split is a *feature flag* (`features.custom_fields`/`features.badges`), not a different API host.
- **Profile enrich filter**: `jetonomy_profile_response` lets Pro append badges/fields onto `GET /users/{id}` — keep `PublicUser.badges?`/`.fields?` optional so a single profile fetch can short-circuit the extra calls if the server already inlined them.
