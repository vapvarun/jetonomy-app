# Reality Check — Jetonomy App vs Jetonomy 1.5.0

**Date:** 2026-06-27
**Checked against:** Jetonomy 1.5.0 / Jetonomy Pro 1.5.0 (releasing; verified on `1.5.0-dev`)
**Purpose:** [`PLAN.md`](./PLAN.md) was written 2026-03-30, before the REST API matured. This document reconciles that plan with what the plugin actually ships, records the auth decision, and defines the plugin-side contract the app depends on.

> **TL;DR** — The app is ~70% unblocked **today**. Most feed/social endpoints already exist and can be consumed directly. Three plugin-side pieces are missing: **mobile token auth**, **`GET /app/config`**, and **native (Expo) push**. We start app development now using **WordPress Application Passwords**, and the three gaps land as a dedicated **Jetonomy 1.6.0 "Mobile API"** milestone.

---

## 1. Endpoint reality map

Every endpoint `PLAN.md` assumes, mapped to the real REST surface (`jetonomy/v1` free, `jetonomy/v1` pro extensions).

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

### ❌ Missing — required before the app can ship

| Gap | PLAN.md assumed | 1.5.0 reality | Resolution |
|---|---|---|---|
| **Mobile auth token** | `POST /auth/token` → JWT | `/auth/login` calls `wp_signon()` → sets a **cookie**, returns `{success, message}` only. 1.5.0 *strengthened* cookie+nonce auth (added `GET /auth/nonce`). No token path exists. | **Phase 0:** WP Application Passwords. **Phase 2 (1.6.0):** `POST /auth/token`. See §2. |
| **`GET /app/config`** | Branding + feature-flag endpoint | Does not exist anywhere | Build in **1.6.0** (free). See §3. Interim: app hardcodes theme + probes feature routes. |
| **Native push** | Expo push tokens | `/push/subscribe` stores a **browser** `PushSubscription` (VAPID / web-push) — wrong transport for a native app | Build native token store + sender in **1.6.0** (pro). See §3. |

### ⚠️ Plan drift to fix in the app spec

- **`GET /wp-json/jetonomy/v1` discovery** — works for free (WP serves the namespace index), but use it only to confirm Jetonomy is present; real capability detection comes from `/app/config`.
- **`GET /space-tags`** — **removed in 1.5.0.** Do not use. Use `GET /tags` / `GET /space-tags` → replaced by `GET /tags`.
- **Auth flow in PLAN.md (login screen)** — rewrite per §2; the username/password→JWT flow it describes is the 1.6.0 target, not the Phase 0 reality.

---

## 2. Auth decision — Application Passwords now, token endpoint in 1.6.0

**Decision (2026-06-27):** ship app development against **WordPress Application Passwords** immediately; replace with a native `POST /auth/token` endpoint in Jetonomy 1.6.0.

### Phase 0 — Application Passwords (today, zero plugin work)

WordPress core (5.6+) exposes Application Passwords. They work as HTTP Basic auth over HTTPS against **every** existing `jetonomy/v1` route — no plugin change needed.

```
1. User enters site URL → app validates GET /wp-json/jetonomy/v1
2. User enters username + an Application Password
   (generated at {site}/wp-admin/profile.php → Application Passwords)
3. App stores { siteUrl, username, appPassword } in Expo SecureStore
4. Every request: Authorization: Basic base64(username:appPassword)
```

- **Pros:** unblocks the entire app build today; no throwaway server code; works with all existing endpoints.
- **Cons:** clunky onboarding (user generates + pastes a password). Acceptable for an internal/beta build; not the production UX.
- **Requirement:** the customer site must serve REST over HTTPS and not strip the `Authorization` header (document the common Apache `CGIPassAuth On` / FastCGI fix in app help).

### Phase 2 — `POST /auth/token` (Jetonomy 1.6.0)

Replace the Application Password flow with a first-party token exchange. See §3 for the contract. The app keeps a thin auth abstraction so swapping Phase 0 → Phase 2 touches only `api/auth.ts` and the login screen.

### Rejected — third-party JWT plugin

Depending on a "JWT Authentication for WP REST API" plugin per customer site was rejected: it violates the native-flow principle, adds a per-site dependency, and carries compat/version risk.

---

## 3. Jetonomy 1.6.0 — "Mobile API" milestone (the contract this app targets)

The three gaps ship together as a named milestone so the app builds against one coherent contract. **This is the canonical spec the plugin side must implement.**

### Free (`jetonomy/v1`)

**`POST /auth/token`** — first-party mobile login.
```
Request:  { user_login, user_password, device_name? }
Response: { token, token_type: "Bearer", expires_at, user: { id, login, display_name, avatar } }
Errors:   401 invalid creds · 403 banned / pending-verification (reuse auth-controller codes) · 429 rate-limited
```
- Reuse the existing `/auth/login` credential + ban + verification checks; differ only in returning a signed bearer token instead of `wp_signon()`.
- `POST /auth/refresh` (optional, same milestone) → new token from a valid/near-expiry one.
- Token accepted via `Authorization: Bearer <token>` on all `jetonomy/v1` routes.

**`GET /app/config`** — single source of truth for theming + capability detection.
```json
{
  "site_name": "string",
  "accent_color": "#3B82F6",
  "logo_url": "https://.../logo.png",
  "login_bg_url": "https://.../bg.png",
  "dark_mode_default": false,
  "jetonomy_version": "1.6.0",
  "pro_active": true,
  "features": {
    "messaging": true, "reactions": true, "polls": true,
    "badges": true, "custom_fields": true, "web_push": true,
    "native_push": true
  }
}
```
- `accent_color` / `logo_url` source from the Pro white-label settings (`/settings/white-label`) when present, else Jetonomy defaults.
- The app shows/hides tabs (e.g. Messages) and inline features purely from `features.*`. **No probing routes for 404s.**

### Pro (`jetonomy/v1` extension — extends web-push)

**Native push store + sender.**
```
POST /push/register-device   { expo_push_token, platform: "ios"|"android", device_name? }
DELETE /push/register-device { expo_push_token }
```
- New transport alongside the existing web `/push/subscribe` — do **not** overload the browser `PushSubscription` route.
- On every Jetonomy notification (reply, mention, message), the notifier fans out to registered Expo tokens via the **Expo Push API** in addition to web-push.
- Payload carries a deep-link target (`post:{id}` / `reply:{id}` / `conversation:{id}`) for tap-to-navigate.

### Out of scope for 1.6.0 (keep the milestone tight)

- Pro wp-admin → app-builder integration endpoints (`/app/register`, `/app/build`, `/app/status`). The build platform (`jetonomy-app-server`) works **standalone** via license-key login; these only add a "build my app from wp-admin" convenience and can come later. (See the server repo's reality-check.)

---

## 4. Revised phasing

| When | App work | Depends on |
|---|---|---|
| **Now** (App Passwords) | Phases 1–3 of PLAN.md: auth abstraction, feed, post detail, votes, replies, spaces, search, notifications, profile, create post. Pro features (messaging/polls/reactions/badges) too — all routes exist. | Nothing — existing 1.5.0 API |
| **Interim theming** | Hardcode accent/logo or read from a bundled config; build the `/app/config` consumer behind a flag. | — |
| **On 1.6.0** | Swap auth → `POST /auth/token`; wire `GET /app/config` for live theming + tab gating; wire native push (`/push/register-device` + tap deep-links). | Jetonomy 1.6.0 Mobile API |
| **White-label** | Phase 5 of PLAN.md: branding from `app.json`, hardcoded-site-URL build, EAS profiles. | jetonomy-app-server |

**Net:** app development is not blocked. Start now; the 1.6.0 milestone removes the last three gaps for a production release.
