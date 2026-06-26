# Jetonomy App — Master Micro-Plan

**Date:** 2026-06-27 · **Source of truth:** free + pro `audit/manifest.json` + the real controllers.
**Goal:** ship the Jetonomy white-label mobile app (Expo) with **100% feature coverage**, a customization layer (Laravel), and the plugin 1.6.0 endpoints — built against locked contracts so there is **no redo/undo**.

This file is the index + coverage proof + build order. Each domain has a full file-by-file spec in its own doc.

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
Foundation + feed + post detail + vote/reply + profile + notifications, authenticating to `forums.local` via an Application Password, bundling clean, opened in the iOS simulator (Xcode). Everything else (spaces, pro social, admin, Laravel builder, native push) layers on the same locked contracts without touching what's already shipped.
