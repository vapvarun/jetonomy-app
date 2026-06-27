# 01 — Foundation + Auth + Media (micro build plan)

**Domain owner:** Foundation / Auth / Account / Media + cross-cutting (REST client, theme, secure store, app config).
**Stack (fixed):** Expo SDK 52 + TypeScript, expo-router (`app/`), Zustand (`stores/`), `@tanstack/react-query` (`hooks/`), axios (`api/`), `expo-secure-store`, NativeWind.
**Source of truth read for this spec:** free manifest `jetonomy/audit/manifest.json` (v1.4.3), `includes/api/class-auth-controller.php`, `class-rest-auth.php`, `class-media-controller.php`, `class-users-controller.php`, `class-base-controller.php`, `class-api.php`, and `docs/plans/app/JETONOMY-1.6.0-MOBILE-API.md`.

---

## 0. Auth model decision (read first — binding on all sibling specs)

Auth is **WordPress core Application Passwords ONLY**. There is **no** mobile-facing token endpoint. The Jetonomy `POST /auth/login` / `/register` / `/lost-password` routes are **cookie-session** flows for the web Login block (they call `wp_signon()` + `wp_set_auth_cookie()`), and are **NOT** used by the app for session auth — a native client cannot consume a `Set-Cookie` session usefully and the manifest's own 1.6.0 plan says so explicitly ("Auth is NOT in this milestone… the app authenticates with WP core Application Passwords"). We still surface them in `api/auth.ts` for the in-app **register** and **lost-password / resend-verification** convenience flows (which create the WP account / trigger emails), but the credential the app stores and sends on every request is an **Application Password**, not a cookie.

Consequence for every sibling domain: all authenticated requests carry `Authorization: Basic base64(user:appPassword)`. Because that is **header auth**, `REST_Auth::auth_mutation()` (class-rest-auth.php:85-98) detects `HTTP_AUTHORIZATION` is set and **skips the cookie X-WP-Nonce check** — so the app never needs `/auth/nonce` or `wp_rest` nonces. Mutations work with the Basic header alone.

---

## 1. `api/client.ts` — axios instances (cross-cutting, every domain imports this)

- **Responsibility:** Build and export the two shared axios instances; inject the Basic auth header from secure store; normalize errors into a typed shape; expose a setter so the auth store can rebuild instances after login/logout/site change.
- **Exports (EXACT — sibling specs depend on these signatures):**
  ```ts
  // api/client.ts
  export let client: AxiosInstance;      // baseURL: `${siteUrl}/wp-json/jetonomy/v1`
  export let coreClient: AxiosInstance;  // baseURL: `${siteUrl}/wp-json`
  export function configureClients(opts: { siteUrl: string; user?: string; appPassword?: string }): void;
  export function clearClientAuth(): void; // drops Authorization header (logout)
  export interface ApiError { code: string; message: string; status: number; data?: unknown; }
  export function toApiError(e: unknown): ApiError; // maps axios error -> WP_Error {code,message,data.status}
  ```
- **Auth header:** `Authorization: 'Basic ' + base64(`${user}:${appPassword}`)` built with `expo-standard-web-crypto`/`Buffer.from(...).toString('base64')`. Set on both instances when creds present.
- **Error contract:** WP returns `{ code, message, data: { status } }`. `toApiError` reads `e.response.data.code/message` and `e.response.status`. Rate-limit (`429 jetonomy_rate_limited`) and `401 jetonomy_invalid_credentials` surface their `code` verbatim so UI can branch.
- **States:** n/a (infra). **Gating:** none.

## 2. `api/auth.ts` — auth + account credential functions

Endpoints map (METHOD path -> controller file:method):

- `login(siteUrl, user, appPassword)` — **validates an Application Password**, not the WP login route. Calls `coreClient.GET /wp/v2/users/me?context=edit` with the Basic header; **200 = valid creds**, **401 = bad creds** (WP core `rest_not_logged_in`/`incorrect_password`). On success immediately also calls `getMe()` (§ jetonomy `GET /users/me`) to hydrate the Jetonomy profile shape. → `wp/v2/users/me` (WP core) + `jetonomy/v1/users/me` -> `Users_Controller::get_current_user`.
  - Rationale: jetonomy `GET /users/me` is `permission_callback => __return_true` (users-controller.php:40) so it never 401s — useless as a credential probe. Core `wp/v2/users/me?context=edit` requires auth, so it is the correct validator. Documented so siblings don't "validate" against the public route.
- `register(params)` — `POST /auth/register` -> `Auth_Controller::register_user`. Body: `{ username, email, password, captcha_token?, website?: '' (honeypot, always send ''), loaded_at?: number (epoch secs at form mount) }`. Returns `{ success, message, requires_verification? }`. Note: server auto-signs-in via cookie which the app ignores — after register the user must still **create an Application Password** (see § login UX) before the app can act.
- `lostPassword(user_login, captcha_token?)` — `POST /auth/lost-password` -> `Auth_Controller::lost_password`. Always returns generic `{ success:true, message }` (enumeration-proof). Rate limit 3/5min.
- `resendVerification(user_login)` — `POST /auth/resend-verification` -> `Auth_Controller::resend_verification`. Generic success. Rate limit 3/5min.
- `getMe()` — `GET /users/me` -> `Users_Controller::get_current_user`. Returns the `Me` shape (§types/user.ts). With Basic auth header resolves the current user; sets `authStore.user`.
- `updateMe(patch)` — `PATCH /users/me` -> `Users_Controller::update_current_user`. Body any subset of `{ display_name, bio, avatar_url, settings, notification_preferences, email_opt_out }`. Returns updated `Me`. (Avatar flow: `uploadMedia()` → take `url` → `updateMe({ avatar_url })`, per manifest note on `/users/me` PATCH.)
- `logout()` — local only: `clearClientAuth()` + wipe secure store + reset `authStore`. No server call (Application Passwords are revoked server-side from wp-admin; we document a "Revoke on site" deep link).
- **NOT surfaced for app session auth:** `POST /auth/login` (cookie `wp_signon`) and `GET /auth/nonce` — see Coverage Table reasons. `verify-email` is a server-side GET redirect (email link), not an app call.
- **States:** each fn throws `ApiError`; hooks own loading/empty/error. **Gating:** all free.

## 3. `api/media.ts` — image upload + community media list

- `uploadMedia(fileUri, opts?: { alt?: string; spaceId?: number })` — `POST /media` -> `Media_Controller::upload_image`. Multipart `FormData` field name **`file`** (controller reads `$_FILES['file']`), optional `alt`, `space_id`. Returns `{ id, url, alt, mime, width, height }`. Auth: Basic header → passes `auth_mutation(['upload_files','jetonomy_upload_media','jetonomy_create_posts','jetonomy_create_replies'])` (ANY). 403 `jetonomy_upload_forbidden` if banned/silenced; 400 `jetonomy_no_file`.
  - RN detail: append `{ uri, name, type } as any` to FormData; set `Content-Type: multipart/form-data` (let axios set boundary). This is the canonical image upload the **Compose** sibling domain calls — exported for reuse.
- `listCommunityMedia(params)` — `GET /media` -> `Media_Controller::list_media`. **Admin-only** (`current_user_can('jetonomy_manage_settings')`). Params `{ page, per_page, author?, space_id?, search?, order }`. Returns paginated `{ data: MediaItem[], meta }`. Surface only behind an admin/owner gate in the app; for normal members this 403s. Mapped but UI-gated.
- **Owns types:** `UploadedMedia`, `MediaItem`. **States:** loading spinner on picker; error toast on 400/403; empty for list. **Gating:** upload free (any content-creator cap); list admin-only.

## 4. `api/config.ts` — app config with graceful fallback

- `getAppConfig()` — `GET /app/config` (jetonomy/v1) -> *ships in plugin 1.6.0, NOT in 1.4.3 manifest*. On `404` (or any network/parse failure) **return `DEFAULT_APP_CONFIG`** (free-only: `pro_active:false`, all `features.*:false`, `accent_color:'#3B82F6'`, `dark_mode_default:false`, null logo/login_bg). Never throw — feature gating must degrade to "free, all-Pro-off".
- Also `getSiteIndex()` — `GET /` -> WP core root (`coreClient.GET ''`). Reads `{ name, description, url, home, gmt_offset, site_icon_url?, namespaces[] }` for white-label (site name/icon/description) and for `apiDiscovery` (namespaces must include `jetonomy/v1`).
- **Owns types:** `AppConfig`, `AppFeatures`, `SiteIndex`. **States:** silent fallback (no error UI). **Gating:** defines the gating source for the whole app.

---

## 5. Theme

### `theme/colors.ts`
- **Responsibility:** `buildTheme(accent: string)` -> token object `{ accent, accentFg, bg, bgSubtle, surface, border, text, textMuted, danger, success, ... }` for light + dark (`buildTheme` returns `{ light, dark }`). Accent comes from `appConfig.accent_color`. Mirrors plugin Color Palette tokens (`accent_color, text_color, bg_color, bg_subtle_color, border_color` from `jetonomy_settings`).
- **Exports:** `buildTheme(accent)`, `DEFAULT_ACCENT='#3B82F6'`, `type Theme`.

### `theme/typography.ts`
- Font scale + weights: `{ xs:12, sm:14, base:16, lg:18, xl:22, '2xl':28 }`, line-heights, families. Exports `typography`, `type Typography`.

### `theme/spacing.ts`
- 4px base scale `{ 0,1:4,2:8,3:12,4:16,5:20,6:24,8:32 }`, `radius`, `hitSlop` (44px min tap target). Exports `spacing`, `radius`.

---

## 6. Stores (Zustand)

### `stores/authStore.ts`
- **State:** `{ siteUrl: string; siteIndex: SiteIndex | null; user: Me | null; creds: { user: string; appPassword: string } | null; appConfig: AppConfig; status: 'unknown'|'unauthed'|'authed'; }`
- **Actions:** `hydrate()` (read secure store on boot → `configureClients` → `getMe()` + `getAppConfig()`), `signIn(siteUrl,user,appPassword)`, `signOut()`, `setAppConfig()`, `setUser()`.
- **Persistence:** `siteUrl` + `creds` via `utils/secureStore.ts`; `user`/`appConfig` in-memory (re-fetched on boot).
- **Selector helpers:** `useIsAuthed()`, `useFeatures()` (returns `appConfig.features`).

### `stores/settingsStore.ts`
- **State:** `{ colorScheme: 'system'|'light'|'dark' }` persisted (AsyncStorage; non-secret). Derives effective scheme from device + `appConfig.dark_mode_default` when `'system'`. Action `setColorScheme()`.

---

## 7. Types

### `types/auth.ts`
```ts
export interface Credentials { user: string; appPassword: string; }
export interface RegisterInput { username: string; email: string; password: string; captcha_token?: string; website?: string; loaded_at?: number; }
export interface AuthMessageResponse { success: boolean; message: string; requires_verification?: boolean; }
```

### `types/user.ts` — the `me` shape (derived from `get_current_user` + `prepare_profile`)
```ts
// GET/PATCH /users/me
export interface Me {
  id: number; user_id: number;
  email: string; display_name: string;
  reputation: number; post_count: number; reply_count: number;
  trust_level: number; trust_level_name: string;
  spaces_joined_count?: number;        // present on GET, not on PATCH
  bio: string | null; avatar_url: string | null;
  last_seen_at: string | null; created_at: string | null; updated_at: string | null;
  settings: Record<string, unknown>;   // decoded JSON (incl. settings.notifications)
  email_opt_out: boolean;
  [k: string]: unknown;                 // jetonomy_profile_response filter may append (custom-fields, badges)
}
// GET /users/{id} and /users/by-login/{login} (consumed by Profile sibling domain)
export interface PublicUser {
  id: number; display_name: string;
  trust_level: number; trust_level_name: string;
  reputation: number; post_count: number; reply_count: number;
  bio: string | null; avatar_url: string | null;
  created_at: string | null; last_seen_at: string | null;
}
// GET /users/suggest item (consumed by Compose/mention sibling domain)
export interface UserSuggestion { id: number; login: string; display_name: string; avatar_url: string; }
export interface NotificationPreferences {
  [type: string]: { web: boolean; email: boolean };
  // valid types: reply_to_post, reply_to_reply, mention, vote_on_post, accepted_answer, new_post_in_sub, badge_earned
}
```

### `types/config.ts`
```ts
export interface AppFeatures { messaging: boolean; reactions: boolean; polls: boolean; badges: boolean; custom_fields: boolean; web_push: boolean; native_push: boolean; }
export interface AppConfig { accent_color: string; logo_url: string | null; login_bg_url: string | null; dark_mode_default: boolean; pro_active: boolean; features: AppFeatures; }
export interface SiteIndex { name: string; description: string; url: string; home: string; gmt_offset: number; site_icon_url?: string; namespaces: string[]; authentication?: Record<string, unknown>; }
```
`media` types live in `api/media.ts` (or `types/media.ts` if shared): `UploadedMedia { id; url; alt; mime; width; height }`, `MediaItem { id; url; thumb; title; mime; author; space_id; date }`.

---

## 8. Utils

- `utils/secureStore.ts` — typed wrappers over `expo-secure-store`: `saveCreds(siteUrl,user,appPassword)`, `loadCreds()`, `clearCreds()`. Single namespace key `jetonomy.creds` (JSON). Never logs values.
- `utils/html.ts` — `renderHtml(html)` (returns props for `react-native-render-html`) and `stripHtml(html)` (plain-text preview for list rows / notifications). WP content is HTML; posts/replies/bio all need this.
- `utils/date.ts` — `relativeTime(iso)` ("2h", "3d") and `formatDate(iso, gmtOffset)`. WP timestamps are UTC `Y-m-d H:i:s` (no `Z`) — parse as UTC then apply `siteIndex.gmt_offset`. Shared by every list domain.
- `utils/apiDiscovery.ts` — `verifyJetonomySite(siteUrl)`: `GET /` (core root), assert `namespaces` includes `'jetonomy/v1'`; fallback probe `GET /wp-json/jetonomy/v1` (route index 200). Returns `{ ok, siteName, siteIcon, hasJetonomy }`. Used by the login screen before saving a site URL.

---

## 9. Screens / navigation

### `app/_layout.tsx` (root)
- Wrap tree in `QueryClientProvider` (one `QueryClient` in `api/queryClient.ts`, default `staleTime: 30s`, `retry: 1`), theme provider (resolve `buildTheme(appConfig.accent_color)` + effective color scheme from `settingsStore`), and run `authStore.hydrate()` on mount.
- **Auth gate:** while `status==='unknown'` render splash; `'unauthed'` → redirect to `app/(auth)/login`; `'authed'` → render `app/(tabs)`.
- **States:** loading (splash during hydrate), error (hydrate failure → treat as unauthed), authed.

### `app/(auth)/login.tsx`
- Fields: **Site URL** (default `http://forums.local`), **Username**, **Application Password**. On submit: `verifyJetonomySite()` → `authStore.signIn()` (validates creds via core `users/me`) → on success store creds + route to tabs.
- Helper row: "How to get an Application Password" → opens WP `wp-admin/authorize-application.php` (see stub below). Links to in-app **Register** (`api/auth.register`) and **Forgot password** (`api/auth.lostPassword`) which use the Jetonomy auth routes.
- **States:** idle / validating (spinner) / error (`401` → "Wrong username or application password", `jetonomy site not found` → "This site isn't running Jetonomy") / success.
- **Gating:** none (pre-auth). White-label: pull `name`/`site_icon_url`/`login_bg_url` from `SiteIndex` + `AppConfig` after a successful site-URL probe.

### `app/(auth)/authorize-application.tsx` — **Phase-2 stub (documented, not built in Phase 1)**
- Tap-to-approve WebView onto `${siteUrl}/wp-admin/authorize-application.php?app_name=Jetonomy&success_url=jetonomyapp://auth-callback`. On the `success_url` redirect WP appends `?site_url=&user_login=&password=`; intercept it, parse the Application Password, call `authStore.signIn()`. Phase 1 ships the manual paste flow above; this screen replaces the manual paste in Phase 2. Deep-link scheme `jetonomyapp://` registered in `app.json`.

### `app/(tabs)/_layout.tsx` — bottom-tab shell (defines the tab contract for sibling specs)
Expo-router `Tabs`. **Tab contract — sibling domains fill the screen files; this file owns the tab registration, icons, and Pro gating:**

| Tab order | Route file (sibling-owned) | Label | Lucide icon | Gating | Owner domain |
|---|---|---|---|---|---|
| 1 | `app/(tabs)/index.tsx` | Home | `home` | free | Feed/Home domain |
| 2 | `app/(tabs)/spaces.tsx` | Spaces | `layout-grid` | free | Spaces domain |
| 3 | `app/(tabs)/notifications.tsx` | Notifications | `bell` (badge = unread-count) | free | Notifications domain |
| 4 | `app/(tabs)/messages.tsx` | Messages | `mail` | **`useFeatures().messaging`** — tab hidden when false | Messaging (Pro) domain |
| 5 | `app/(tabs)/profile.tsx` | Profile | `user` | free (shows `Me`) | Profile/Account domain |

- Messages tab is conditionally registered: `if (!features.messaging) return null` for that `<Tabs.Screen>` so the tab disappears on free sites. All other tabs always present.
- Notifications badge consumes `GET /notifications/unread-count` (Notifications domain) — this shell only reserves the `tabBarBadge` slot.
- **States:** the shell renders instantly post-auth; per-tab loading/empty/error owned by each screen.

---

## 10. Build order (this domain)
1. `api/client.ts` + `utils/secureStore.ts` + `theme/*` + `types/*` (no deps).
2. `api/config.ts`, `utils/apiDiscovery.ts`, `utils/date.ts`, `utils/html.ts`.
3. `stores/authStore.ts`, `stores/settingsStore.ts`.
4. `api/auth.ts`, `api/media.ts`.
5. `app/_layout.tsx`, `app/(auth)/login.tsx`, `app/(tabs)/_layout.tsx`.
6. `app/(auth)/authorize-application.tsx` — Phase-2 stub file only.

---

## COVERAGE TABLE — manifest endpoint → app file/function

**Owned endpoints (auth + account/me + media): 10/10 mapped.**

| # | Manifest endpoint (method path) | Controller | App file → function | Notes |
|---|---|---|---|---|
| 1 | POST `/auth/register` | `Auth_Controller::register_user` | `api/auth.ts → register()` | honeypot `website:''` + `loaded_at` sent |
| 2 | POST `/auth/lost-password` | `Auth_Controller::lost_password` | `api/auth.ts → lostPassword()` | generic success |
| 3 | POST `/auth/resend-verification` | `Auth_Controller::resend_verification` | `api/auth.ts → resendVerification()` | generic success |
| 4 | POST `/auth/login` | `Auth_Controller::login` | **not-surfaced for app auth** | cookie `wp_signon`; app uses Application Passwords. Validation done via core `wp/v2/users/me`. |
| 5 | GET `/auth/verify-email` | `Auth_Controller::verify_email` | **n/a** | server-side GET that 302-redirects; opened in browser from email link, never an app fetch |
| 6 | GET `/auth/nonce` | `Auth_Controller::get_nonce` | **n/a** | header (Basic) auth skips X-WP-Nonce (`auth_mutation` cookie branch); app never needs wp_rest nonces |
| 7 | GET `/users/me` | `Users_Controller::get_current_user` | `api/auth.ts → getMe()` | returns `Me`; hydrates `authStore.user` |
| 8 | PATCH `/users/me` | `Users_Controller::update_current_user` | `api/auth.ts → updateMe()` | profile edit + avatar_url + email_opt_out + notification_preferences |
| 9 | POST `/media` | `Media_Controller::upload_image` | `api/media.ts → uploadMedia()` | FormData field `file`; reused by Compose domain |
| 10 | GET `/media` | `Media_Controller::list_media` | `api/media.ts → listCommunityMedia()` | admin-only (`jetonomy_manage_settings`); UI-gated |

**Adjacent user-read endpoints (account-adjacent; delegated, not owned here):**

| Manifest endpoint | Controller | Delegated to | Type provided here |
|---|---|---|---|
| GET `/users/{id}` | `Users_Controller::get_item` | Profile domain (`api/users.ts → getUser()`) | `PublicUser` in `types/user.ts` |
| GET `/users/by-login/{login}` | `Users_Controller::get_by_login` | Profile domain | `PublicUser` |
| GET `/users/{id}/posts` | `Users_Controller::get_user_posts` | Profile domain | uses Feed `Post` type |
| GET `/users/suggest?q=&space_id=` | `Users_Controller::suggest` | Compose/mention domain | `UserSuggestion`. Note: perm is `is_user_logged_in()` (manifest's `__return_true` is stale) |

**Non-manifest (WP core / 1.6.0) used by this domain:**

| Endpoint | App file → function | Reason |
|---|---|---|
| GET `/wp-json/` (core root) | `api/config.ts → getSiteIndex()` | site name/description/icon + namespace discovery |
| GET `/wp/v2/users/me?context=edit` (core) | `api/auth.ts → login()` | Application Password validator (401 on bad creds) |
| GET `/app/config` (jetonomy 1.6.0, not in 1.4.3) | `api/config.ts → getAppConfig()` | feature gating; **404 → `DEFAULT_APP_CONFIG` fallback** |
| POST/DELETE `/push/register-device` (pro 1.6.0) | **n/a here** | native push owned by Notifications/Pro domain |

---

## Addendum — Multi-tenant / multi-site (governed by `00-MASTER-PLAN.md` §0)

This is a **site-agnostic public-distribution** app (any Jetonomy site), plus white-label per-site builds — not a single-site app. Foundation implications:

- **`authStore` holds many sessions, one active.** Shape: `{ sites: Record<siteUrl, Session>, activeSiteUrl: string | null }` where `Session = { siteUrl, user, appPasswordRef, appConfig }`. `configureClients()` switches to the active session. v1 UI may show one active site with "add / switch site," but the store must not assume a single credential. App-password secrets live in SecureStore keyed by `siteUrl`.
- **Login is site-discovery first.** `app/(auth)/login.tsx`: enter site URL → `utils/apiDiscovery.validateJetonomy(url)` (`GET {url}/wp-json/jetonomy/v1`, require HTTPS unless host resolves to a `local` env) → only then collect username + Application Password. Clear errors for non-Jetonomy / unreachable / `Authorization`-stripped hosts.
- **`forums.local` is a dev prefill only**, behind `__DEV__`; never a hardcoded constant in shared code.
- **White-label build** sets a build-time `APP_SITE = { url, hardcoded:true, branding }` (from the Laravel build-config). When `APP_SITE.hardcoded`, login hides the Site URL field + skips discovery and seeds the single session from `APP_SITE`; theme seeds from baked branding, then refreshes from `/app/config`. Same screens, same logic — only the entry differs.
