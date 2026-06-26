# Jetonomy App

White-label community forum mobile app. One React Native / Expo codebase builds every customer's branded app, connecting to any Jetonomy-powered WordPress site via the `jetonomy/v1` REST API.

- **Stack:** React Native + Expo SDK 52+, Expo Router, Zustand, React Query, NativeWind, EAS Build/Submit.
- **Status:** Planning. No app code yet — this repo currently holds the build plan.

## Docs

| Doc | What |
|---|---|
| [`docs/PLAN.md`](./docs/PLAN.md) | Original architecture + screen-by-screen spec + 7-week phasing (2026-03-30). |
| [`docs/2026-06-REALITY-CHECK.md`](./docs/2026-06-REALITY-CHECK.md) | **Read this second.** Reconciles the plan with Jetonomy 1.5.0: endpoint reality map, the auth decision (**WP core Application Passwords — no JWT**), and the lean **Jetonomy 1.6.0** add this app targets. |

## Current state

- ~70% of required endpoints already exist in Jetonomy 1.5.0 and can be consumed directly.
- **Auth = WordPress core Application Passwords** (`wp-admin/authorize-application.php` tap-to-approve flow). No JWT, no custom token endpoint — Jetonomy is a WP plugin, so we don't duplicate what core provides.
- Only two small Jetonomy-specific gaps (`GET /app/config` for white-label color/flags, native Expo push) land in **Jetonomy 1.6.0** — see the reality-check doc.

## Related

- [`jetonomy-app-server`](https://github.com/vapvarun/jetonomy-app-server) — Laravel build platform (`app.jetonomy.com`) that produces white-label builds of this app.
- `vapvarun/jetonomy` + `vapvarun/jetonomy-pro` — the WordPress plugin pair this app talks to.
