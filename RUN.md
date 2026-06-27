# Running the Jetonomy App

A **generic, multi-tenant** Expo (React Native) client for any [Jetonomy](https://jetonomy.com) community. Nothing site-specific is compiled in — a member opens the app, **enters their own community's site URL**, signs in with a per-site WordPress **Application Password**, and the app pulls that site's branding + feature set at runtime. `forums.local` is only the dev/test community, never a baked-in target.

> White-label builds (one branded app per site, URL baked in) are produced by the separate Laravel builder (`jetonomy-app-server`) from this same codebase via `scripts/inject-branding.js` + the EAS `build.yml` workflow. They are not needed to run the app locally.

---

## 1. Prerequisites

- **Node 20+** and **npm** (repo built/tested on Node 20–22).
- **Xcode** (iOS Simulator) and/or an Android emulator, **or** the **Expo Go** app on a physical device.
- A reachable Jetonomy site to log into (the `jetonomy` free plugin active). We test against `forums.local`.

## 2. Install & start

```bash
cd /Users/varundubey/Documents/GitHub/jetonomy-app
npm install
npx expo start
```

Then:
- Press **`i`** to open the **iOS Simulator** (Xcode), or **`a`** for Android.
- Or scan the QR code with **Expo Go** on a physical device (same Wi-Fi).

## 3. Get an Application Password (auth = WP core Application Passwords; no JWT, no nonces)

On the Jetonomy site you want to log into:

1. Visit `http://forums.local/wp-admin/profile.php` — for this local dev site you can auto-login as admin with `http://forums.local/wp-admin/profile.php?autologin=1`.
2. Scroll to **Application Passwords**, enter a name (e.g. `Jetonomy App`), click **Add New Application Password**.
3. Copy the generated password (looks like `xxxx xxxx xxxx xxxx xxxx xxxx`).

## 4. Sign in (the flow)

1. **Site URL** — enter the community URL (e.g. `http://forums.local`). In a `__DEV__` build this field is **prefilled** with `http://forums.local`; in production it starts empty. The app calls `GET {url}/wp-json/jetonomy/v1` to confirm it's a real, reachable Jetonomy site before asking for credentials.
   - Real (public) sites must be **HTTPS**. `*.local` / `*.test` / loopback / LAN IPs are allowed over `http://` for dev.
2. **Username + Application Password** — paste the password from step 3. Credentials are validated against core `wp/v2/users/me?context=edit` (which 401s correctly on bad creds).
3. You land on the **Home** feed. Every request thereafter carries `Authorization: Basic base64(user:appPassword)`.

## 5. Simulator caveat — `forums.local` may not resolve in the iOS Simulator

The iOS Simulator does **not** always inherit the macOS hosts entry for Local-by-Flywheel's `forums.local`. If site verification fails in the simulator, use one of:

- **Local Live Link** — in Local, enable **Live Link** and use the generated `https://…ngrok…` (or Local's HTTPS) URL. HTTPS works everywhere, including a physical device on cellular.
- **Mac LAN IP** — find it (`ipconfig getifaddr en0`), then in Local point the site at it / use `http://<mac-ip>:<port>`. Good for a physical device on the same Wi-Fi.
- A physical device with **Expo Go** + Local Live Link is the most reliable end-to-end test.

## 6. What works today vs. what "lights up" with plugin 1.6.0

The whole app is **404-graceful**: it runs against any Jetonomy version and degrades cleanly when a route is absent.

| Surface | On 1.4.x / 1.5.x (no 1.6.0 routes) | When plugin **1.6.0** is deployed to the site |
|---|---|---|
| `GET /app/config` | 404 → `DEFAULT_APP_CONFIG` (all Pro features off, default accent) | real branding + per-site feature flags |
| `GET /feed` | falls back to per-space / recent lists | unified home feed |
| `POST /push/register-device` | 404 → push silently `unsupported`; app fully usable | native Expo push fan-out + device registration |

So you can run and exercise the full free experience now; Pro UI (messaging, reactions, polls, advanced moderation, analytics, etc.) and native push **turn on automatically per-site** once 1.6.0 ships and the site enables those features — **no app update required**.

## 7. Verifying the build gates (no-redo gate)

```bash
npx tsc --noEmit            # type-check — must be clean
npx expo export --platform ios   # production bundle — must say "Exported: dist"
```

Both must pass before shipping. They are the CI gate this repo is held to.

## 8. Notes for the simulator smoke test (Xcode)

- **Tabs**: Home · Spaces · Notifications (unread badge) · Messages (hidden unless the site has `features.messaging`) · Profile. Admin lives under `app/manage/*`, entered from Profile.
- **Deep links**: tapping an in-app notification, or an OS push notification, routes to the **native** post/space/user screen — the server's web `url` is never opened in a WebView.
- **Pro seams** (reactions, polls, report/flag) render only when the site enables them; on a free site they return `null` and the layout is unaffected.
- Push tokens require a **real device or a dev build** — the iOS Simulator cannot mint an Expo push token, so push registration no-ops there (expected).

---

### Project layout (orientation)

```
api/        thin REST clients (jetonomy/v1, wp/v2) + React Query wiring
app/        expo-router screens — (auth), (tabs), post/, space/, conversation/, manage/, user/, tag/
components/  shared UI + Pro seams (ReactionBar, PollView, FlagButton)
hooks/      React Query hooks + usePushNotifications (deep-link bridge)
stores/     zustand (authStore = multi-site sessions, pushStore, settingsStore, announcementStore)
theme/      tokens (colors.ts) + ThemeContext; branding.ts is injected at white-label build time
utils/      apiDiscovery (site validation), push, date, html, secureStore
scripts/    inject-branding.js (white-label build-time branding)
.github/    build.yml (EAS build + branding injection workflow)
```
