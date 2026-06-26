# Micro Build Plan — 06 · Moderation + Admin + Pro-Admin + Push

Flags/moderation queue · Space moderation · Admin (recount/trust-level) · Advanced-moderation (rules) ·
Analytics · Webhooks · Web-push / native push · Email-digest · Site-announcements · Reply-by-email · SEO-Pro ·
White-label · AI usage.

Authoritative source: `vapvarun/jetonomy` `audit/manifest.json` + `jetonomy-pro` `audit/manifest.json`. Every contract
below was lifted from the actual controller method, not the manifest summary:
- free `includes/api/class-moderation-controller.php`, `class-space-moderation-controller.php`, `class-admin-controller.php`
- pro `includes/extensions/{advanced-moderation,analytics,webhooks,web-push,email-digest,site-announcements,reply-by-email,seo-pro,white-label,ai}/class-extension.php`

Read on 2026-06-27 (Jetonomy 1.5.x line). The native-push endpoint is a documented **gap** (ships in plugin 1.6.0) — see
§Native-Push Gap.

## Fixed conventions (inherited from foundation 01, shared with 02–05)

- Expo SDK 52 + TS, expo-router (`app/`), Zustand (`stores/`), React Query (`hooks/`), axios (`api/`), NativeWind.
- `client`/`coreClient` from `api/client.ts` (foundation). `client` baseURL = `${siteUrl}/wp-json/jetonomy/v1`;
  WP Application-Password **Basic auth** attached by foundation — **no nonces**. Never redefine auth/baseURL here. All
  paths below are relative to that baseURL. **All Pro extension routes register under the free `jetonomy/v1` namespace**,
  so they use the same `client` — there is no separate Pro axios client.
- Errors: WP REST envelope `{ code, message, data:{ status } }` → foundation interceptor throws `ApiError`
  (`.status`/`.code`/`.message`); use `toApiError(err)` in catch blocks.
- **Gating — server-403 is the source of truth.** This domain is overwhelmingly admin / space-moderator only. Do NOT
  compute capabilities client-side. Read coarse flags from `me` / app-config to decide whether to *render the entry
  point* (`features.*` Pro flags + `me.capabilities`), then **treat the server 403 as authoritative**: every `app/manage/*`
  screen renders a `ForbiddenState` (not a crash) when the API returns 403. Member-facing seams (flag a post, view a
  site-announcement, register for push, edit own digest prefs) are separate and need only `read` / logged-in.
- **No new tab.** Tab contract stays Home/Spaces/Notifications/Messages/Profile. Admin lives under
  **Profile → Manage** (`app/manage/*`). Push + announcements + flag-content are member-facing seams woven into existing
  screens (Content's PostDetail/ReplyItem, the app shell, Settings).

## Capability flags read from `me` / app-config (render-gate only, never authoritative)

```ts
// types/admin.ts — EXTEND types/user.ts Me, do not duplicate.
// Coarse render hints surfaced by /users/me capabilities + /config feature flags:
//   me.capabilities.jetonomy_moderate   → show Manage ▸ Queue / Flags / global moderation
//   me.capabilities.jetonomy_manage_spaces → show space moderation + SEO entry
//   me.capabilities.manage_options      → show Admin (recount, webhooks, white-label, ai, digest-admin)
//   features.advanced_moderation | analytics | webhooks | web_push | email_digest
//        | site_announcements | seo_pro | white_label | ai   → Pro on/off
// Hidden entry point is a convenience; the screen STILL handles 403 as the real gate.
```

---

# PART A — MEMBER-FACING

## components/moderation/FlagButton.tsx
- **Responsibility** — icon/overflow action attached to Content's `PostDetail` + `ReplyItem` (02 seam). Opens a reason
  sheet (spam/abuse/off-topic/other + optional note), POSTs a flag, shows optimistic "Reported" toast, disables on repeat.
- **Endpoints** — `POST /flags -> Moderation_Controller::create_flag` (generic; body `{ object_type:'post'|'reply',
  object_id, reason, note? }`). Convenience alias also exists: `POST /posts/{id}/flags` (same `create_flag`) — prefer the
  generic `/flags` for replies, use `/posts/{id}/flags` only when only a post id is in hand.
- **TS types** — `types/moderation.ts`: `FlagReason = 'spam'|'abuse'|'off_topic'|'other'`; `CreateFlagBody`;
  `FlagResult { id:number; status:'open' }`. (Confirm exact reason enum against `create_flag` arg whitelist at build.)
- **States** — idle / submitting / reported (sticky) / 403 (not allowed → hide) / 409 already-flagged (treat as success).
- **Gating** — member-facing; `jetonomy_flag` cap (granted to `read` by default). Render always; server decides.

## api/flags.ts
- **Responsibility** — thin client for the member flag action only (admin flag *management* lives in `api/moderation.ts`).
- **Endpoints** — `createFlag(body) -> POST /flags`; `flagPost(postId, body) -> POST /posts/{id}/flags`.
- **TS types** — re-exports from `types/moderation.ts`.
- **States** — n/a (pure fns; React Query mutation in `hooks/useFlag.ts`).
- **Gating** — `read`.

## api/push.ts  ⚠ targets a NOT-YET-SHIPPED endpoint
- **Responsibility** — register / unregister this device's **Expo push token** with the server. See §Native-Push Gap.
- **Endpoints (planned, plugin 1.6.0)** — `registerDevice({ token, platform:'ios'|'android', device_id }) ->
  POST /push/register-device`; `unregisterDevice({ token }) -> DELETE /push/register-device`.
  **Graceful no-op:** on `404`/`ApiError.status===404` (route absent until 1.6.0) → resolve silently, set
  `pushStore.supported=false`, log once. Never surface an error toast for the 404.
- **Do NOT call** `/push/subscribe` / `/push/vapid-key` / `/push/service-worker.js` — those are **browser web-push (VAPID)**
  and are inapplicable to a native Expo app (no `ServiceWorker`/`PushManager`). Documented n/a in the coverage table.
- **TS types** — `types/push.ts`: `RegisterDeviceBody`, `DeviceRegistration`.
- **States** — unsupported (404) / registered / denied-permission / error.
- **Gating** — `read` (logged-in device owner).

## utils/push.ts
- **Responsibility** — `expo-notifications` integration: request permission, fetch Expo push token
  (`getExpoPushTokenAsync`), hand it to `api/push.ts`, register the foreground handler, and a **deep-link handler** that
  maps a notification payload `{ url }` (server already emits `base_url()+'/notifications/'`, post/space deep links) to an
  expo-router route (`/notifications`, `/s/[slug]`, `/s/[slug]/t/[id]`). Android channel setup.
- **Endpoints** — none directly (delegates to `api/push.ts`).
- **States** — permission undetermined/granted/denied; token-available; no-op when `pushStore.supported===false`.
- **Gating** — member-facing; OS permission + logged-in.

## api/announcements.ts (member read)
- **Responsibility** — fetch active site announcements for the banner.
- **Endpoints** — `listAnnouncements() -> GET /site-announcements -> Site_Announcements::rest_list`.
  ⚠ The route's `permission_callback` is `permission_manage` — **verify at build** whether read for ordinary members is
  allowed (super-sticky pins are meant to be member-visible). If `rest_list` is manage-only, the *display* data instead
  rides on the normal feed/post payload (announcements are pinned posts) and this client is admin-only. Flag in
  Cross-Domain Notes; do not assume.
- **TS types** — `types/announcements.ts`: `SiteAnnouncement { id, title, excerpt, space_slug, url, pinned_at, expires_at }`.
- **States** — loading / list / empty (render nothing) / 403 (hide banner).
- **Gating** — member display if allowed; else admin-only (see CRUD in Part B).

## components/announcements/AnnouncementBanner.tsx
- **Responsibility** — dismissible top-of-Home banner (carousel if >1, capped at 5 server-side) that links into the pinned
  post. Per-id local dismiss persisted in `announcementStore`.
- **Endpoints** — consumes `api/announcements.ts` (or feed-embedded pin data per the verify note above).
- **States** — hidden / single / stacked / dismissed.
- **Gating** — member-facing display.

## api/digest.ts (member prefs — owned by People domain 04, provided here)
- **Responsibility** — read/update the logged-in member's email-digest preferences. Surfaced on the **Settings** screen
  (owned by People/04); this file + types are produced here, the screen consumes them.
- **Endpoints** — `getDigestPreferences() -> GET /users/me/digest-preferences -> Email_Digest::rest_get_preferences`
  (perm `is_user_logged_in`); `updateDigestPreferences(body) -> PATCH /users/me/digest-preferences ->
  Email_Digest::rest_update_preferences` (perm `read`). Body `{ frequency:'off'|'daily'|'weekly', hour?:number }`
  (confirm field names: `frequency`, `hour` per arg sanitizers).
- **TS types** — `types/digest.ts`: `DigestFrequency`, `DigestPreferences`.
- **States** — loading / saved / saving / error.
- **Gating** — logged-in member (NOT admin). Distinct from `api/digest-admin.ts` (Part B).

---

# PART B — ADMIN (under `app/manage/*`, server-403 authoritative)

> Every screen below: render `ForbiddenState` on 403, `EmptyState` on empty, `ErrorState` + retry on other errors,
> skeleton on load. All lists paginate server-side (`page`/`per_page`) — no "load all". Entry tiles hidden unless the
> matching coarse cap/feature flag is present, but the screen re-checks via the live 403.

## app/manage/index.tsx
- **Responsibility** — Manage home; grid of tiles (Queue, Flags, Spaces, Analytics, Rules, Announcements, Webhooks, AI,
  White-label, SEO, Recount) filtered by coarse caps/feature flags. Each tile deep-links to its screen.
- **Endpoints** — none (reads `me`/app-config from stores).
- **TS types** — `ManageTile`.
- **States** — renders subset; empty (no admin caps) → "No management tools for your account".
- **Gating** — visible if any of `jetonomy_moderate | jetonomy_manage_spaces | manage_options`.

## app/manage/queue.tsx + (api/moderation.ts)
- **Responsibility** — global moderation queue: list pending post/reply objects, approve / spam / trash / ban author /
  bulk-act. Filter by `status`, `type`; paginate.
- **Endpoints**
  - `GET /moderation/queue -> Moderation_Controller::get_queue` (args `status`, `type`, `page`, `per_page`).
  - `POST /moderation/approve/{type}/{id} -> ::approve` (`type` = `post|reply`).
  - `POST /moderation/spam/{type}/{id} -> ::mark_spam`.
  - `POST /moderation/trash/{type}/{id} -> ::trash_content`.
  - `POST /moderation/ban -> ::ban_user` (body `{ user_id, reason?, space_id?, expires_at? }`; perm route-level `read`,
    capability re-checked inside).
  - `DELETE /moderation/ban/{id} -> ::unban_user`.
  - `POST /moderation/bulk -> ::bulk_action` (body `{ action:'approve'|'spam'|'trash', items:[{type,id}] }`).
- **TS types** — `types/moderation.ts`: `QueueItem { object_type, object_id, author, excerpt, created, flags_count }`,
  `ModerationAction`, `BanBody`, `BulkActionBody`.
- **States** — load / list+pager / multi-select bulk bar / per-row optimistic remove / 403 / empty ("Queue clear") /
  concurrency: 409/410 "already moderated" → drop row + toast.
- **Gating** — `jetonomy_moderate` (server-authoritative).

## app/manage/flags.tsx + (api/moderation.ts)
- **Responsibility** — global flags list; resolve a flag; jump to flagged object; view a single post's flags.
- **Endpoints**
  - `GET /moderation/flags -> ::list_flags` (args `status`, `page`, `per_page`).
  - `POST /moderation/flags/{id}/resolve -> ::resolve_flag` (body `{ resolution?, action? }`).
  - `GET /posts/{id}/flags -> ::get_post_flags` (per-object flag detail).
- **TS types** — `Flag { id, object_type, object_id, reason, note, reporter, status, created }`, `ResolveFlagBody`.
- **States** — load / list / resolve-optimistic / 403 / empty / concurrency already-resolved.
- **Gating** — `jetonomy_moderate`.

## app/manage/space/[id].tsx + (api/moderation.ts space slice)
- **Responsibility** — per-space moderation for space moderators (scoped, lighter than global). List that space's flags,
  resolve, and act (approve/spam/trash) on its objects.
- **Endpoints**
  - `GET /spaces/{id}/moderation/flags -> Space_Moderation_Controller::list_flags` (perm `require_view_space_queue`).
  - `POST /spaces/{id}/moderation/flags/{flag_id}/resolve -> ::resolve_flag` (perm route-level `read`, scope checked
    inside).
  - `POST /spaces/{id}/moderation/{action}/{type}/{obj_id} -> ::act_on_object` (`action`=approve|spam|trash,
    `type`=post|reply).
- **TS types** — reuse `Flag`/`QueueItem`; add `SpaceModerationScope`.
- **States** — load / list / act-optimistic / 403 (not a moderator of THIS space) / empty.
- **Gating** — `jetonomy_manage_spaces` OR per-space moderator (server decides via `require_view_space_queue`).

## app/manage/analytics.tsx + api/analytics.ts (Pro)
- **Responsibility** — admin analytics dashboard: overview KPIs, engagement trend, top spaces, top contributors,
  moderation stats. Date-range + space filters. (Export + diff-report are admin-only extras.)
- **Endpoints** (all `GET`, perm = extension `$perm` / `manage_options`)
  - `/analytics/overview -> Analytics::rest_overview`
  - `/analytics/engagement -> ::rest_engagement`
  - `/analytics/top-spaces -> ::rest_top_spaces` (arg `limit`)
  - `/analytics/top-contributors -> ::rest_top_contributors` (arg `limit`)
  - `/analytics/moderation -> ::rest_moderation`
  - `/analytics/export -> ::rest_export` (CSV/JSON export — wire as "Export" action; opens/share-sheets the payload)
  - `/analytics/diff-report -> ::rest_diff_report` (perm `can_admin_diff_report`; arg date range — admin diagnostic,
    surface behind an "Advanced" disclosure).
- **TS types** — `types/analytics.ts`: `AnalyticsOverview`, `EngagementSeries`, `TopSpace`, `TopContributor`,
  `ModerationStats`, `ExportRequest`, `DiffReport`.
- **States** — per-card load/empty/error; range picker; 403 → ForbiddenState.
- **Gating** — `features.analytics` + `manage_options` (server-authoritative).

## app/manage/rules.tsx + api/modRules.ts (Pro advanced-moderation)
- **Responsibility** — CRUD advanced auto-moderation rules (pattern/link-count/keyword) + per-rule stats.
- **Endpoints**
  - `GET /moderation/rules -> Advanced_Moderation::list_rules` (perm `is_moderator`).
  - `POST /moderation/rules -> ::create_rule` (perm `jetonomy_moderate`; body `{ name, type, pattern, action, ... }`).
  - `PATCH /moderation/rules/{id} -> ::update_rule`.
  - `DELETE /moderation/rules/{id} -> ::delete_rule`.
  - `GET /moderation/rules/{id}/stats -> ::get_rule_stats` (perm `is_moderator`).
- **TS types** — `types/modRules.ts`: `ModRule { id, name, type, pattern, action, enabled }`, `ModRuleStats`,
  `CreateModRuleBody`, `UpdateModRuleBody`.
- **States** — list / create-sheet / edit / delete-confirm / empty / 403 / regex-invalid server error surfaced inline.
- **Gating** — `features.advanced_moderation` + `jetonomy_moderate`.

## app/manage/announcements.tsx + api/announcements.ts (admin CRUD slice)
- **Responsibility** — admin pin/unpin a post as a super-sticky cross-space site announcement (cap 5 server-side); list
  current pins. (Member read slice is in Part A.)
- **Endpoints**
  - `GET /site-announcements -> Site_Announcements::rest_list` (perm `permission_manage`).
  - `POST /site-announcements/{id} -> ::rest_pin` (perm `manage_options` OR `jetonomy_manage_spaces`).
  - `DELETE /site-announcements/{id} -> ::rest_unpin` (same perm).
- **TS types** — reuse `SiteAnnouncement` + `PinAnnouncementBody`.
- **States** — list / pin (cap-reached 4xx → "Max 5 announcements") / unpin-optimistic / 403 / empty.
- **Gating** — `features.site_announcements` + (`manage_options` | `jetonomy_manage_spaces`).

## app/manage/webhooks.tsx + api/webhooks.ts (Pro)
- **Responsibility** — CRUD outgoing webhooks + send a test delivery.
- **Endpoints** (all perm `manage_options`)
  - `GET /webhooks -> Webhooks::rest_list`
  - `POST /webhooks -> ::rest_create` (body `{ url, events:[], secret?, active }`)
  - `PATCH /webhooks/{id} -> ::rest_update`
  - `DELETE /webhooks/{id} -> ::rest_delete`
  - `POST /webhooks/{id}/test -> ::rest_test`
- **TS types** — `types/webhooks.ts`: `Webhook { id, url, events, active, last_status }`, `CreateWebhookBody`,
  `WebhookTestResult`.
- **States** — list / create / edit / delete-confirm / test (spinner → delivery code/result) / 403 / empty.
- **Gating** — `features.webhooks` + `manage_options`.

## app/manage/ai.tsx + api/ai.ts (Pro)
- **Responsibility** — read-only AI usage dashboard (token/cost usage detail + summary), filter by date/feature/model.
- **Endpoints** (both `GET`, perm `rest_admin_check`)
  - `/ai/usage -> AI::rest_get_usage` (args date range, feature, model)
  - `/ai/usage/summary -> ::rest_get_usage_summary`
- **TS types** — `types/ai.ts`: `AiUsageRow`, `AiUsageSummary`.
- **States** — load / table+pager / summary cards / empty / 403.
- **Gating** — `features.ai` + `manage_options`.

## app/manage/white-label.tsx + api/whiteLabel.ts (Pro)
- **Responsibility** — read + update white-label settings (brand name, logo, accent color, custom CSS, links).
- **Endpoints**
  - `GET /settings/white-label -> White_Label::get_settings_api` (perm closure — confirm admin check at build).
  - `PATCH /settings/white-label -> ::update_settings_api` (perm `manage_options`; many sanitized fields: name, logo_url,
    accent_color, custom_css, footer html, links).
- **TS types** — `types/whiteLabel.ts`: `WhiteLabelSettings`.
- **States** — load / form / saving / saved / validation (color/css rejected) / 403.
- **Gating** — `features.white_label` + `manage_options`.

## app/manage/seo.tsx + api/seo.ts (Pro seo-pro)
- **Responsibility** — per-space SEO editor (title, description, og image, canonical, robots) for space managers.
- **Endpoints**
  - `GET /spaces/{id}/seo -> SEO_Pro::get_space_seo` (perm closure — space-manage check).
  - `PATCH /spaces/{id}/seo -> ::update_space_seo` (perm `jetonomy_manage_spaces`; fields title, description, og_image,
    canonical, robots, …).
- **TS types** — `types/seo.ts`: `SpaceSeo`.
- **States** — load / form / saving / saved / 403 / per-field validation.
- **Gating** — `features.seo_pro` + `jetonomy_manage_spaces` (scoped to the space).

## app/manage/recount.tsx + api/admin.ts (free admin)
- **Responsibility** — site-owner maintenance: rebuild denormalized counts; bulk-set user trust levels.
- **Endpoints** (both perm `manage_options`)
  - `POST /admin/recount -> Admin_Controller::recount` (body `{ type? }` — which counters to rebuild).
  - `POST /admin/users/trust-level -> ::bulk_set_trust_level` (body `{ user_ids:[], trust_level }`).
- **TS types** — `types/admin.ts`: `RecountRequest`, `TrustLevelBody`.
- **States** — idle / running (long op — disable + spinner) / done summary / 403 / partial-failure report.
- **Gating** — `manage_options`.

## api/digest-admin.ts (Pro email-digest, admin slice)
- **Responsibility** — admin digest tools: send a test digest, view digest stats. (Consumed by an "Email digest" card on
  `app/manage/index.tsx` or folded into analytics; member prefs are `api/digest.ts` in Part A.)
- **Endpoints**
  - `POST /admin/digest/test -> Email_Digest::rest_send_test` (perm `manage_options`).
  - `GET /admin/digest/stats -> ::rest_get_stats` (perm closure `manage_options`).
- **TS types** — `types/digest.ts`: `DigestStats`, `SendTestDigestBody`.
- **States** — idle / sending / sent / stats load/empty/error / 403.
- **Gating** — `features.email_digest` + `manage_options`.

---

# Native-Push Gap (must read before building push)

The existing pro `web-push` extension is **browser web-push only** — it issues VAPID keys, serves a service worker, and
stores `PushSubscription` endpoints (`/push/subscribe`, `/push/vapid-key`, `/push/service-worker.js`). None of that works
in a native Expo app, which delivers notifications via **Expo Push tokens** (APNs/FCM under the hood), not the W3C Push API.

**Required server addition (plugin 1.6.0):** `POST /push/register-device` + `DELETE /push/register-device` that store an
Expo push token per user/device and route Jetonomy notification events to Expo's push service. Until that ships:
- `api/push.ts` targets `/push/register-device` and **no-ops gracefully on 404** (sets `pushStore.supported=false`, no
  error toast). The rest of the app is fully functional without push.
- `utils/push.ts` still requests OS permission + acquires the token so the moment the server route lands, registration
  succeeds with no client change.
- This gap is tracked as a TODO in the build log and must be reflected in the plugin's `audit/manifest.json` when 1.6.0
  adds the route.

---

# COVERAGE TABLE — every in-scope endpoint → file/fn (or n/a + reason)

| # | METHOD | Route | Controller::method | App file / fn | Member/Admin |
|---|--------|-------|--------------------|---------------|--------------|
| 1 | POST | /flags | Moderation::create_flag | api/flags.ts `createFlag` + FlagButton | Member |
| 2 | POST | /posts/{id}/flags | Moderation::create_flag | api/flags.ts `flagPost` | Member |
| 3 | GET | /posts/{id}/flags | Moderation::get_post_flags | api/moderation.ts `getPostFlags` (flags.tsx) | Admin |
| 4 | GET | /moderation/queue | Moderation::get_queue | api/moderation.ts `getQueue` (queue.tsx) | Admin |
| 5 | POST | /moderation/approve/{type}/{id} | Moderation::approve | api/moderation.ts `approve` | Admin |
| 6 | POST | /moderation/spam/{type}/{id} | Moderation::mark_spam | api/moderation.ts `markSpam` | Admin |
| 7 | POST | /moderation/trash/{type}/{id} | Moderation::trash_content | api/moderation.ts `trash` | Admin |
| 8 | GET | /moderation/flags | Moderation::list_flags | api/moderation.ts `listFlags` (flags.tsx) | Admin |
| 9 | POST | /moderation/flags/{id}/resolve | Moderation::resolve_flag | api/moderation.ts `resolveFlag` | Admin |
| 10 | POST | /moderation/bulk | Moderation::bulk_action | api/moderation.ts `bulkAction` | Admin |
| 11 | POST | /moderation/ban | Moderation::ban_user | api/moderation.ts `banUser` | Admin |
| 12 | DELETE | /moderation/ban/{id} | Moderation::unban_user | api/moderation.ts `unbanUser` | Admin |
| 13 | GET | /spaces/{id}/moderation/flags | Space_Moderation::list_flags | api/moderation.ts `listSpaceFlags` (space/[id]) | Admin (scoped) |
| 14 | POST | /spaces/{id}/moderation/flags/{flag_id}/resolve | Space_Moderation::resolve_flag | api/moderation.ts `resolveSpaceFlag` | Admin (scoped) |
| 15 | POST | /spaces/{id}/moderation/{action}/{type}/{obj_id} | Space_Moderation::act_on_object | api/moderation.ts `actOnSpaceObject` | Admin (scoped) |
| 16 | POST | /admin/recount | Admin::recount | api/admin.ts `recount` (recount.tsx) | Admin |
| 17 | POST | /admin/users/trust-level | Admin::bulk_set_trust_level | api/admin.ts `setTrustLevel` | Admin |
| 18 | GET | /moderation/rules | Advanced_Moderation::list_rules | api/modRules.ts `listRules` (rules.tsx) | Admin |
| 19 | POST | /moderation/rules | Advanced_Moderation::create_rule | api/modRules.ts `createRule` | Admin |
| 20 | PATCH | /moderation/rules/{id} | Advanced_Moderation::update_rule | api/modRules.ts `updateRule` | Admin |
| 21 | DELETE | /moderation/rules/{id} | Advanced_Moderation::delete_rule | api/modRules.ts `deleteRule` | Admin |
| 22 | GET | /moderation/rules/{id}/stats | Advanced_Moderation::get_rule_stats | api/modRules.ts `getRuleStats` | Admin |
| 23 | GET | /analytics/overview | Analytics::rest_overview | api/analytics.ts `overview` | Admin |
| 24 | GET | /analytics/top-spaces | Analytics::rest_top_spaces | api/analytics.ts `topSpaces` | Admin |
| 25 | GET | /analytics/top-contributors | Analytics::rest_top_contributors | api/analytics.ts `topContributors` | Admin |
| 26 | GET | /analytics/engagement | Analytics::rest_engagement | api/analytics.ts `engagement` | Admin |
| 27 | GET | /analytics/moderation | Analytics::rest_moderation | api/analytics.ts `moderationStats` | Admin |
| 28 | GET | /analytics/export | Analytics::rest_export | api/analytics.ts `export` | Admin |
| 29 | GET | /analytics/diff-report | Analytics::rest_diff_report | api/analytics.ts `diffReport` | Admin |
| 30 | GET | /webhooks | Webhooks::rest_list | api/webhooks.ts `list` | Admin |
| 31 | POST | /webhooks | Webhooks::rest_create | api/webhooks.ts `create` | Admin |
| 32 | PATCH | /webhooks/{id} | Webhooks::rest_update | api/webhooks.ts `update` | Admin |
| 33 | DELETE | /webhooks/{id} | Webhooks::rest_delete | api/webhooks.ts `remove` | Admin |
| 34 | POST | /webhooks/{id}/test | Webhooks::rest_test | api/webhooks.ts `test` | Admin |
| 35 | GET | /users/me/digest-preferences | Email_Digest::rest_get_preferences | api/digest.ts `getDigestPreferences` | Member |
| 36 | PATCH | /users/me/digest-preferences | Email_Digest::rest_update_preferences | api/digest.ts `updateDigestPreferences` | Member |
| 37 | POST | /admin/digest/test | Email_Digest::rest_send_test | api/digest-admin.ts `sendTest` | Admin |
| 38 | GET | /admin/digest/stats | Email_Digest::rest_get_stats | api/digest-admin.ts `getStats` | Admin |
| 39 | GET | /site-announcements | Site_Announcements::rest_list | api/announcements.ts `list` (member display + admin.tsx) | Member/Admin* |
| 40 | POST | /site-announcements/{id} | Site_Announcements::rest_pin | api/announcements.ts `pin` (announcements.tsx) | Admin |
| 41 | DELETE | /site-announcements/{id} | Site_Announcements::rest_unpin | api/announcements.ts `unpin` | Admin |
| 42 | GET | /spaces/{id}/seo | SEO_Pro::get_space_seo | api/seo.ts `getSpaceSeo` (seo.tsx) | Admin (scoped) |
| 43 | PATCH | /spaces/{id}/seo | SEO_Pro::update_space_seo | api/seo.ts `updateSpaceSeo` | Admin (scoped) |
| 44 | GET | /settings/white-label | White_Label::get_settings_api | api/whiteLabel.ts `get` (white-label.tsx) | Admin |
| 45 | PATCH | /settings/white-label | White_Label::update_settings_api | api/whiteLabel.ts `update` | Admin |
| 46 | GET | /ai/usage | AI::rest_get_usage | api/ai.ts `usage` (ai.tsx) | Admin |
| 47 | GET | /ai/usage/summary | AI::rest_get_usage_summary | api/ai.ts `usageSummary` | Admin |
| — | POST | /push/register-device | (ships 1.6.0) | api/push.ts `registerDevice` | Member |
| — | DELETE | /push/register-device | (ships 1.6.0) | api/push.ts `unregisterDevice` | Member |

\* #39 member-vs-admin depends on `permission_manage` allowing member read — verify at build (see api/announcements.ts note).

## Endpoints intentionally NOT mapped to the app (server-only / inapplicable)

| METHOD | Route | Reason |
|--------|-------|--------|
| POST | /reply-by-email/inbound | **Server-to-server.** Inbound mail webhook from an IMAP poller / mail provider; `permission_callback '__return_true'` validated by signature inside the callback. No app surface — replies arrive by email, not from the client. |
| POST | /push/subscribe | **Browser web-push (VAPID).** W3C PushSubscription endpoint — no equivalent in a native Expo app. Superseded by `/push/register-device`. |
| DELETE | /push/subscribe | Same as above (web-push unsubscribe). |
| GET | /push/vapid-key | **Browser web-push only.** VAPID public key for the browser PushManager; irrelevant to Expo push tokens. |
| GET | /push/service-worker.js | **Browser web-push only.** Serves the SW script; native apps have no service worker. |

---

## Cross-Domain Notes

- **`types/moderation.ts` is shared** between Part A (FlagButton/`api/flags.ts`) and Part B (`api/moderation.ts`). Declare
  once; do not duplicate `Flag`/`QueueItem`.
- **`api/announcements.ts`** holds both member-read and admin-CRUD; gate the CRUD fns behind admin screens only. Resolve
  the #39 permission ambiguity in code review before shipping the member banner.
- **`api/digest.ts` (member) vs `api/digest-admin.ts` (admin)** are deliberately separate files mapping to different
  permission tiers — keep them split so a member build never imports the admin route.
- **Space-scoped admin** (#13–15, #42–43) returns 403 when the user manages a *different* space; the screen must treat 403
  as "not your space," not a global auth failure.
- Analytics auth-error handling: the 1.4.2.x manifest note records analytics surfacing auth errors instead of silent empty
  data — so `app/manage/analytics.tsx` must render `ErrorState`/`ForbiddenState`, never a blank dashboard.
