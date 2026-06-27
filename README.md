# Jetonomy App

A **white-label community app** for [Jetonomy](https://store.wbcomdesigns.com/jetonomy/) — the WordPress community/forum plugin. One React Native (Expo) codebase that connects to **any** Jetonomy-powered site and **themes itself** from that site's branding. Run it as-is, or build your own branded version with Expo.

> **Status:** working. Auth, home feed, post detail, voting, replies, spaces, profile, notifications, search, and the Pro surfaces (messaging, reactions, polls, badges, custom fields) are implemented and bundle clean.

- **Stack:** Expo SDK 52 + TypeScript, Expo Router, Zustand, React Query, NativeWind, EAS Build/Submit.
- **Auth:** WordPress **Application Passwords** (core — no JWT, no custom token plugin).
- **Backend:** the `jetonomy/v1` REST API on the user's own WordPress site.

---

## How it works

1. A member opens the app and enters **their community's site URL**.
2. The app validates it's a Jetonomy site and reads its branding from `GET /jetonomy/v1/app/config` — **logo, accent color, and community name** — so it themes itself per site.
3. They sign in with a WordPress **Application Password** and use their community: feed, posts, votes, replies, spaces, messaging, and more.

The app keeps its own polished, accessible, dark-mode-correct base theme and brands the **accent + logo + name** per site — so every community looks branded while staying readable.

## Branding — set it in WordPress, no rebuild needed

Site owners control how the app looks from their normal WP admin:

| Setting | Where |
|---|---|
| Community name | **Jetonomy → Settings → General → Community Title** |
| Accent color | **Jetonomy → Settings → Appearance → Color Palette → Accent** |
| Logo | **Jetonomy → Settings → Appearance → Logo** |

The app reads these live from `/app/config`. (Requires Jetonomy **1.6.0+**; older sites still work with sensible defaults.)

---

## Run it (development)

```bash
git clone https://github.com/vapvarun/jetonomy-app.git
cd jetonomy-app
npm install
npx expo start            # press i (iOS) / a (Android), or scan with Expo Go
```

On the login screen, enter your Jetonomy site URL + a WordPress Application Password
(generate one at `your-site.com/wp-admin` → Users → Profile → Application Passwords).

> Native push needs a dev build (not Expo Go) — see [`EAS-SETUP.md`](./EAS-SETUP.md).

## Build & ship your own branded app (bring your own Expo)

You publish under **your own** Expo + Apple/Google accounts — you own the app and its store listings. Full steps in **[`EAS-SETUP.md`](./EAS-SETUP.md)**:

```bash
npm i -g eas-cli
eas login                 # your Expo account
eas init                  # links the project
eas build --profile development --platform ios   # simulator/dev build (no Apple acct)
# Store builds: eas build --profile production + eas submit  (Apple $99/yr, Google $25)
```

White-label store builds bake your icon + name into the listing; for in-app branding (logo/colors/name) you just set them in WordPress as above.

---

## Requirements

- A WordPress site running **[Jetonomy](https://store.wbcomdesigns.com/jetonomy/)** (free). **Jetonomy Pro** unlocks messaging, reactions, polls, badges, custom fields, and native push.
- **Jetonomy 1.6.0+** for `/app/config` (per-site branding) and the global `/feed`.
- Node 20+, and Xcode (iOS) / Android Studio for native builds. EAS handles cloud builds + store submission.

## Project layout

```
app/            Expo Router screens (auth, tabs, post, space, conversation, manage…)
api/            Typed REST client + per-domain modules (App Passwords auth)
components/     PostCard, ReplyItem, VoteButton, ReactionBar, PollView, …
hooks/ stores/  React Query hooks + Zustand stores (multi-site sessions)
theme/          Per-site theming from /app/config
docs/           Architecture, build plan, and the micro-plan (file-by-file)
```

## Docs

- [`docs/micro-plan/00-MASTER-PLAN.md`](./docs/micro-plan/00-MASTER-PLAN.md) — architecture, full endpoint coverage, contracts
- [`EAS-SETUP.md`](./EAS-SETUP.md) — build & submit with Expo
- [`RUN.md`](./RUN.md) — running against a local/dev site

## License

GPL-2.0-or-later (matches the Jetonomy plugin). Contributions welcome.
