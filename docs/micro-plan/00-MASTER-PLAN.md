# Jetonomy App — Master Micro-Plan

**Date:** 2026-06-27 · **Source of truth:** free + pro `audit/manifest.json` + the real controllers.
**Goal:** ship the Jetonomy white-label mobile app (Expo) with **100% feature coverage**, a customization layer (Laravel), and the plugin 1.6.0 endpoints — built against locked contracts so there is **no redo/undo**.

This file is the index + coverage proof + build order. Each domain has a full file-by-file spec in its own doc.

---

## 0. Distribution & tenancy model (READ FIRST — governs everything)

**The app is site-agnostic, multi-tenant, public distribution. It is NOT built for any one site.** Two ship targets, one codebase:

1. **Generic public app** — a single app published on the App Store / Play Store. A member opens it, **enters their own community's site URL**, the app validates it's a Jetonomy site (`GET {url}/wp-json/jetonomy/v1`), authenticates with a per-site **Application Password**, pulls that site's branding/features from `{url}/wp-json/jetonomy/v1/app/config`, and runs. Like the WordPress / Mastodon apps. **Nothing site-specific is compiled in.**
2. **White-label builds** — any site owner uses the Laravel builder (`jetonomy-app-server`) to generate **their own** branded app from the same codebase: site URL hardcoded, branding/colors/icon baked at build time, published under their own name for their members.

**Distribution decision (see `jetonomy-app-server/docs/micro-plan.md §12`):** model **A — generic container app** (one store listing, multi-tenant, runtime branding) is the PRIMARY product for everyone (no Apple 4.3 clone risk, instant onboarding); model **B — white-label store app** is a premium tier that publishes under the **customer's own** Apple/Google developer accounts (mandatory to avoid 4.3) via `eas build` + `eas submit`, with per-customer signing credentials and an EAS Update channel for fleet updates. Target A first; B is gated behind tier + customer-supplied store credentials.

**Consequences baked into the design (do not violate):**
- `siteUrl` is always runtime state (from the login field, or the white-label build-time constant) — never a hardcoded constant in shared code. `forums.local` is a **dev/test target only**, never special-cased.
- The app must tolerate **any** Jetonomy version: a site on 1.4.x has no `/app/config`, `/feed`, or native push → every such call is **404-graceful with sensible fallback** (already specced). Feature presence is per-site, detected at runtime (`/app/config.features` + route presence), never assumed.
- Connecting to **arbitrary user-entered sites over the public internet**: require HTTPS for real sites (App Passwords need it; `forums.local` is exempt as `local` env), validate the URL is Jetonomy before asking for credentials, fail clearly on non-Jetonomy / unreachable / blocked-Authorization-header sites.
- **Multi-site membership** (a user in several Jetonomy communities): `authStore` must be shaped to hold **multiple saved site sessions** with one active, switchable — not a single global credential. (v1 may surface one active site with add/switch; the store shape must not preclude many. This is a design constraint, flagged in `01-foundation-auth.md`.)
- White-label vs generic differ **only** by a build-time config (`site.hardcoded` + branding from build-config) — same screens, same logic; the white-label build hides the "Site URL" login field and skips site discovery.

---

## 1. Feature coverage scorecard (100% of app-applicable endpoints)

| # | Domain | Spec file | Endpoints mapped |
|---|---|---|---|
| 01 | Foundation · Auth · Media | `01-foundation-auth.md` | 10/10 |
| 02 | Content (posts/replies/votes/search/tags/drafts) | `02-content.md` | 28/28 |
| 03 | Spaces · Discovery · Personal (bookmarks/subs) | `03-spaces-personal.md` | 27/27 |
| 04 | People · Notifications · Profile (+pro fields/badges) | `04-people-notifications.md` | 28/28 |
| 05 | Pro Social (messaging/reactions/polls) | `05-pro-social.md` | 21/21 |
| 06 | Moderation · Admin · Push (+pro-admin) | `06-moderation-admin-push.md` | 47/47 |
| — | **Mobile total** | | **161/161** |
| S | Laravel customization layer | `../../jetonomy-app-server/docs/micro-plan.md` | full |
| P | Plugin 1.6.0 additions | `jetonomy/docs/plans/app/JETONOMY-1.6.0-MOBILE-API-MICRO.md` | 12 changes |

**Explicitly excluded (server-only, not an app surface), with reason:**
- `POST /reply-by-email/inbound` — server-to-server mail webhook.
- `POST/DELETE /push/subscribe`, `GET /push/vapid-key`, `GET /push/service-worker.js` — browser web-push (VAPID/SW); native app uses Expo push instead (see plugin change #9).
- Field/badge CRUD + manual award (`manage_options`) — typed as `api/` seams, surfaced only in the admin `app/manage/*` section, not the member UI.

---

## 2. Locked cross-domain contracts (do not redefine downstream)

These are fixed by the foundation spec; every other domain consumes them as-is. This is what prevents rework.

**API client** (`api/client.ts`) exports: `client` (baseURL `${siteUrl}/wp-json/jetonomy/v1`), `coreClient` (`${siteUrl}/wp-json`), `configureClients({siteUrl,user,appPassword})`, `clearClientAuth()`, `ApiError`, `toApiError()`. **All requests carry `Authorization: Basic base64(user:appPassword)` — WP core Application Passwords, no JWT, no nonces.**

**Feature gating:** `useFeatures()` (from `authStore`, backed by `api/config.ts → getAppConfig()` with `404 → DEFAULT_APP_CONFIG` all-Pro-off). Pro UI gates on `features.*`; free is always on. Components self-gate and return `null` when off — parents mount unconditionally (zero Pro imports).

**Tab shell** (`app/(tabs)/_layout.tsx`): Home `index.tsx` · Spaces `spaces.tsx` · Notifications `notifications.tsx` (badge ← `/notifications/unread-count`) · Messages `messages.tsx` (hidden unless `features.messaging`) · Profile `profile.tsx`. Admin lives under `app/manage/*` (no tab), entered from Profile.

**Type ownership:** `types/user.ts` → `Me`/`PublicUser`/`UserSuggestion` (foundation; others extend). `types/post.ts`+`PostCard`/`ReplyItem`/`ContentBody` → Content (02); space feeds + bookmarks + my-posts reuse them. `uploadMedia()` (FormData `file`) is the canonical image upload. WP timestamps are UTC `Y-m-d H:i:s`, parsed via `utils/date.ts` with `siteIndex.gmt_offset`.

**Content ↔ Pro seam (exact):** `PostDetail` mounts `<ReactionBar target={{kind:'post',id}} seed={post.reactions}/>` + `<PollView postId={post.id} seed={post.poll}/>` after `ContentBody`; `ReplyItem` mounts `<ReactionBar target={{kind:'reply',id}} seed={reply.reactions}/>`. Gating lives inside those components.

**Auth validation:** login validates creds against core `wp/v2/users/me?context=edit` (it 401s correctly; jetonomy `/users/me` is `__return_true` and never rejects). Notifications deep-link via `object_type`+`object_id` (`post|reply|badge|user`) → native routes, never WebView.

---

## 3. Build order (waves + gates — this is the no-redo guarantee)

Contracts above are frozen first; dependents build against them. Each gate must pass before the next wave.

### Track P — Plugin 1.6.0 (free → pro), gives the app its final contract
- **P1 (free `1.6.0-dev`):** `/app/config`, `/feed`, `prepare_post`/`prepare_space` enrichments (`is_bookmarked`,`viewer_vote`,`is_member`,`viewer_role`,`is_subscribed`), manifest drift fixes. Gate: `php -l` + WPCS + contract-audit + deploy to `forums.local`.
- **P2 (pro `1.6.0-dev`):** `/push/register-device` (+ fix the dead `on_notification_created` 7-arg bind + Expo fan-out), announcements member read, digest-prefs verify, pro manifest fixes. Gate: same.

> The app api/ modules are **fallback-designed** (graceful 404 on `/app/config`, `/feed`, `/push/register-device`), so Track A can build in parallel and simply lights up when P1/P2 land — **no app rework either way.**

### Track A — Mobile app (strict intra-app order)
- **A0 Foundation** (`01`): expo init, `client.ts`, auth (App Passwords), `authStore`, `config.ts`, theme, `_layout` tab shell, utils, types/user+config. **Gate: `tsc --noEmit` + `expo export` clean.**
- **A1 Content** (`02`) → **A2 Spaces+Personal** (`03`) → **A3 People+Notifications** (`04`). Free member core. **Gate per domain: tsc + bundle clean.**
- 🎯 **MVP = "first working app" milestone** after A0+A1(feed/post/vote/reply)+A3(profile/notifications): runnable in Xcode/simulator against `forums.local`.
- **A4 Pro Social** (`05`) → **A5 Moderation/Admin/Push** (`06`). Pro-gated; seams already reserved. **Gate: tsc + bundle clean.**
- **A6 Integration:** `RUN.md`, deep-link wiring, final bundle + simulator smoke.

### Track S — Laravel customization layer (independent, any time)
- Per `jetonomy-app-server/docs/micro-plan.md`: 11-step order, Docker stack, `LicenseService` + `build-config` JSON + `build.yml` + `inject-branding.js`. Bridge JSON contract = §4 of that doc.

---

## 4. Open "verify-at-build" items (flagged by the specs — confirm before coding that file)
1. `site-announcements` member read path — confirm permission, add `/announcements/active` if manage-only (plugin #10).
2. `/users/me/digest-preferences` — confirm route exists; add if missing (plugin #11).
3. Pro reactions/polls **manifest** is stale vs served routes — reconcile (plugin #12, docs-only).
4. `prepare_post`/`prepare_space` enrichments are **additive** but per-row → add batch helpers for `/feed` + lists (big-site rule).
5. Re-binding `on_notification_created` (dead → live) changes observable push behavior — smoke-test, don't read as new spam.

---

## 5. What "deliver first working app" means here
The **generic, site-agnostic** app: launch → enter *any* Jetonomy site URL (we test with `forums.local`, but it accepts any site) → log in with an Application Password → feed + post detail + vote/reply + profile + notifications. Bundles clean, opened in the iOS simulator (Xcode). It is the multi-tenant public app from day one — `forums.local` is just the test community, not a baked-in target. Everything else (spaces, pro social, admin, Laravel white-label builder, native push) layers on the same locked contracts without touching what's already shipped.
