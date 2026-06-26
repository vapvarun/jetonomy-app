# Jetonomy App

White-label community forum mobile app. One React Native / Expo codebase builds every customer's branded app, connecting to any Jetonomy-powered WordPress site via the `jetonomy/v1` REST API.

- **Stack:** React Native + Expo SDK 52+, Expo Router, Zustand, React Query, NativeWind, EAS Build/Submit.
- **Status:** Planning. No app code yet — this repo currently holds the build plan.

## Docs

| Doc | What |
|---|---|
| [`docs/PLAN.md`](./docs/PLAN.md) | Original architecture + screen-by-screen spec + 7-week phasing (2026-03-30). |
| [`docs/2026-06-REALITY-CHECK.md`](./docs/2026-06-REALITY-CHECK.md) | **Read this second.** Reconciles the plan with Jetonomy 1.5.0: endpoint reality map, the auth decision (Application Passwords now → `POST /auth/token` in 1.6.0), and the **Jetonomy 1.6.0 "Mobile API" contract** this app targets. |

## Current state

- ~70% of required endpoints already exist in Jetonomy 1.5.0 and can be consumed directly.
- Auth for app dev uses **WordPress Application Passwords** (Phase 0), swapped for a first-party `POST /auth/token` in Jetonomy 1.6.0.
- Three plugin-side gaps (token auth, `GET /app/config`, native Expo push) land as the **Jetonomy 1.6.0 "Mobile API"** milestone — see the reality-check doc.

## Related

- [`jetonomy-app-server`](https://github.com/vapvarun/jetonomy-app-server) — Laravel build platform (`app.jetonomy.com`) that produces white-label builds of this app.
- `vapvarun/jetonomy` + `vapvarun/jetonomy-pro` — the WordPress plugin pair this app talks to.
