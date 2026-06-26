# Reality Check — Jetonomy App vs Jetonomy 1.5.0

**Date:** 2026-06-27
**Checked against:** Jetonomy 1.5.0 / Jetonomy Pro 1.5.0 (releasing; verified on `1.5.0-dev`)
**Purpose:** [`PLAN.md`](./PLAN.md) was written 2026-03-30, before the REST API matured. This document reconciles that plan with what the plugin actually ships, records the auth decision, and defines the (small) plugin-side contract the app depends on.

> **Guiding principle:** Jetonomy *is* a WordPress plugin — **use WP core for everything WP core already provides, and never duplicate it.** Auth, site discovery, media, users: WordPress ships these. The app and the plugin only add what is genuinely Jetonomy-specific.

> **TL;DR** — The app is ~70% unblocked **today**. Most feed/social endpoints already exist and can be consumed directly. Authentication uses **WordPress Application Passwords** (core) — no JWT, no custom token endpoint. Only **two** small Jetonomy-specific gaps remain: a thin **`GET /app/config`** (white-label color + feature flags core can't express) and **native (Expo) push**. They land as a lean **Jetonomy 1.6.0** add.

---

## 1. Endpoint reality map

Every endpoint `PLAN.md` assumes, mapped to the real REST surface (`jetonomy/v1` free + pro extensions).

### ✅ Exists today — consume directly

**Free (`jetonomy/v1`)**

| App need | Real route |
|---|---|
| Home / space feed | `GET /spaces/{id}/posts`, `GET /posts` |
| Post detail | `GET /posts/{id}`, `GET /posts/{id}/replies` |
| Create post / reply | `POST /spaces/{id}/posts`, `POST /posts/{id}/replies` |
| Vote | `POST /posts/{id}/vote`, `POST /replies/{id}/vote` |
| Accept answer | `POST /replies/{id}/accept` |
| Spaces / categories | `GET /spaces`, `GET /categories`, `GET /spaces/{id}/members` |
| Search | `GET /search` |
| Notifications | `GET /notifications`, `/unread-count`, `/mark-all-read`, `PATCH /notifications/{id}` |
| Profile | `GET /users/me`, `GET /users/{id}`, `GET /users/{id}/posts`, `GET /users/by-login/{login}` |
| Bookmarks | `GET/POST /bookmarks`, `DELETE /bookmarks/{post_id}` |
| Subscriptions | `GET/POST /subscriptions` |
| Tags | `GET /tags` |
| Drafts | `GET /posts/drafts` |
| Link preview (compose) | `GET /link-preview` |

**Pro (`jetonomy/v1` extensions)**

| App need | Real route |
|---|---|
| Messaging (Tab 4) | `GET/POST /conversations`, `/conversations/{id}/messages`, `/conversations/unread-count`, archive/mute/leave/block |
| Reactions | `GET/POST /posts/{id}/reactions`, `/replies/{id}/reactions` |
| Polls | `GET /posts/{post_id}/poll`, `POST /polls/{id}/vote` |
| Badges | `GET /badges`, `GET /users/{id}/badges` |
| Custom fields | `GET /fields`, `GET /users/{id}/fields`, `GET /posts/{id}/fields`, `GET /users/me/fields` |

### ✅ Provided by WP core — use core, do not build

| App need | WP core mechanism |
|---|---|
| **Authentication** | **Application Passwords** + `wp-admin/authorize-application.php` approve flow (see §2). No JWT, no token endpoint. |
| Site name / description / icon / timezone | `GET /wp-json/` root index (`name`, `description`, `url`, `home`, `gmt_offset`, `site_icon_url`) |
| Capability/feature discovery | `GET /wp-json/` `namespaces` + `routes` — Pro extensions register their routes only when enabled, so route presence ≈ feature enabled |
| Media upload | core `POST /wp/v2/media` |

### ❌ Genuinely missing (Jetonomy-specific) — small 1.6.0 add

| Gap | Why core can't cover it | Resolution |
|---|---|---|
| **`GET /app/config`** (thin) | White-label **accent color** + **logo override** and Jetonomy feature flags not inferable from the route index aren't in core | Build in **1.6.0** (free), thin — see §3. Interim: hardcode theme + use the core `/wp-json/` index for site name/icon + route-presence detection. |
| **Native push** | `/push/subscribe` stores a **browser** `PushSubscription` (VAPID/web-push); core has no push at all | Build native Expo-token store + sender in **1.6.0** (pro) — see §3. |

### ⚠️ Plan drift to fix in the app spec

- **Auth flow in PLAN.md's login screen** — rewrite per §2. The username/password → JWT flow it sketches is **not** what we're building; we use the WP core Application Passwords approve flow.
- **`GET /space-tags`** — **removed in 1.5.0.** Use `GET /tags`.
- **`GET /wp-json/jetonomy/v1` discovery** — keep, but it only confirms Jetonomy is present; site metadata comes from the core `/wp-json/` root.

---

## 2. Auth decision — WordPress Application Passwords (core). No JWT.

**Decision (2026-06-27):** the app authenticates with **WP core Application Passwords**. We do **not** build a custom token/JWT endpoint — that would duplicate a feature WordPress already ships, maintains, and security-patches.

### The flow (native, not copy-paste)

WordPress core (5.6+) ships `wp-admin/authorize-application.php`, an OAuth-like approve screen for native apps. Verified in core: it accepts `app_name`, `app_id`, `success_url`, `reject_url`; on approval it calls `WP_Application_Passwords::create_new_application_password()` and redirects to `success_url?site_url=…&user_login=…&password=<urlencoded>`.

```
1. User enters site URL → app validates GET {url}/wp-json/jetonomy/v1
2. App opens in a webview:
   {url}/wp-admin/authorize-application.php
     ?app_name=Jetonomy&app_id=<uuid>&success_url=jetonomyapp://auth
3. User logs in (if needed) and taps "Approve"
4. WP redirects → jetonomyapp://auth?site_url=…&user_login=…&password=…
5. App stores { siteUrl, userLogin, appPassword } in Expo SecureStore
6. Every request: Authorization: Basic base64(userLogin:appPassword)
   → works against ALL existing jetonomy/v1 + wp/v2 routes
```

For **white-label** builds the site URL is hardcoded; the app jumps straight to step 2.

### Why this, not JWT

- **Zero plugin code** — no token store, no auth filter, no refresh/revoke logic to write or secure.
- **Works for every member**, not just admins; each user manages their own Application Passwords.
- **Revocable per-device** from the user's profile; core-maintained and patched.
- Honours the project principle: *don't duplicate what WordPress provides.*

### Honest trade-offs (accepted)

- The approve screen shows **wp-admin chrome**, not white-label branding (one tap; cosmetic).
- Requires **HTTPS** + the `Authorization` header reaching PHP (document the FastCGI / `CGIPassAuth On` fix). A few security plugins disable Application Passwords — document the requirement, and detect `authentication.application-passwords` in the `/wp-json/` index to show a clear error.
- Ban / email-verification gates are not enforced at credential-*creation* time → **REST permission callbacks must keep enforcing them per-route** (they largely do; verify as a 1.6.0 contract test).

### Rejected

- **Custom JWT / `POST /auth/token`** — duplicates WP core Application Passwords. Dropped from the plan.
- **Third-party JWT plugin** — per-site dependency, compat risk, violates the native-flow principle.

---

## 3. Jetonomy 1.6.0 — the small Jetonomy-specific add the app needs

Auth is solved by core, so 1.6.0 is lean: **two** endpoints, both genuinely Jetonomy-specific. Canonical plugin-side spec lives in `jetonomy/docs/plans/app/JETONOMY-1.6.0-MOBILE-API.md`.

### Free (`jetonomy/v1`)

**`GET /app/config`** — thin; only what core's `/wp-json/` index can't express.
```json
{
  "accent_color": "#3B82F6",
  "logo_url": "https://.../logo.png",
  "login_bg_url": "https://.../bg.png",
  "dark_mode_default": false,
  "pro_active": true,
  "features": { "messaging": true, "reactions": true, "polls": true,
                "badges": true, "custom_fields": true, "web_push": true,
                "native_push": true }
}
```
- Source `accent_color` / `logo_url` from Pro white-label (`/settings/white-label`) when active, else Jetonomy defaults.
- `features.*` is a convenience mirror of route-registration so the app reads one block instead of parsing the index; each Pro extension reports its own flag (filterable).
- Public read (pre-login theming). **Do not** restate site name/description/icon — the app reads those from the core `/wp-json/` root.

### Pro (`jetonomy/v1` — web-push extension)

**Native push — Expo token store + sender** (new transport alongside the browser `/push/subscribe`; do not overload it).
```
POST   jetonomy/v1/push/register-device   { expo_push_token, platform: "ios"|"android", device_name? }
DELETE jetonomy/v1/push/register-device   { expo_push_token }
```
- On every Jetonomy notification (reply, mention, message) the notifier fans out to registered Expo tokens via the **Expo Push API** in addition to web-push.
- Payload carries a deep-link target (`post:{id}` / `reply:{id}` / `conversation:{id}`).

### Out of scope for 1.6.0

- Pro wp-admin → app-builder endpoints (`/app/register`, `/app/build`, `/app/status`). The build platform works standalone via license-key login — see the server repo's reality-check.

---

## 4. Revised phasing

| When | App work | Depends on |
|---|---|---|
| **Now** | Phases 1–3 of PLAN.md: WP-core Application Passwords auth, feed, post detail, votes, replies, spaces, search, notifications, profile, create post. Pro features (messaging/polls/reactions/badges) too — all routes exist. | Nothing — existing 1.5.0 API + WP core |
| **Interim theming** | Read site name/icon from core `/wp-json/`; hardcode accent/logo or bundle a config; build the `/app/config` consumer behind a flag. | — |
| **On 1.6.0** | Wire `GET /app/config` for live white-label theming + tab gating; wire native push (`/push/register-device` + tap deep-links). | Jetonomy 1.6.0 |
| **White-label** | Phase 5 of PLAN.md: branding from `app.json`, hardcoded-site-URL build, EAS profiles. | jetonomy-app-server |

**Net:** app development is not blocked — start now on WP core auth. 1.6.0 adds just two small Jetonomy-specific endpoints for a production release.
