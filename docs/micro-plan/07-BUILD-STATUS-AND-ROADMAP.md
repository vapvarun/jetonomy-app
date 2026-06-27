# Build Status & Roadmap

**Updated:** 2026-06-27 · Companion to `00-MASTER-PLAN.md` (the spec). This is the living **state + next steps**.

---

## 1. What's built & verified

| Area | Built | Live-verified (iOS sim vs forums.local) |
|---|---|---|
| App foundation (auth, client, theme, nav, multi-tenant authStore) | ✅ | ✅ login + site discovery |
| Content (feed, post detail, vote, reply, compose, search, tags, drafts) | ✅ | ✅ API contracts swept live (clean); Home feed visually verified |
| Spaces / People / Notifications / Profile | ✅ | ✅ API contracts swept live (clean) |
| Pro: messaging, reactions, polls, badges, custom fields | ✅ | ✅ API contracts swept live (clean) |
| Moderation / admin / push registration | ✅ | ✅ API contracts swept live (3 pro bugs found + fixed) |
| Plugin 1.6.0 free (`/app/config`, `/feed`, prepare_* enrich, auth hardening) | ✅ | ✅ deployed to forums.local, endpoints 200 |
| Plugin 1.6.0 pro (`/push/register-device`, `/announcements/active`, push fan-out fix) | ✅ | ✅ deployed, routes + table verified |
| Laravel builder (model A: license → branding → build pipeline) | ✅ scaffolded, tests pass | ❌ not brought up in Docker |
| Laravel model-B (store creds + eas submit) | ✅ scaffolded plan-only | ❌ needs Apple/Google accounts |
| EAS | project `wbcomdesigns/jetonomy` linked, **dev build FINISHED** | ✅ ran in iOS simulator |

**End-to-end proven:** EAS build → install → launch → WP Application-Passwords login → **live Home feed from forums.local**.

## 2. Bugs found by running it (all fixed + pushed)

| Bug | Cause | Fix (commit) |
|---|---|---|
| Login "Unknown error" | `toApiError` double-wrap + iOS AutoFill injecting `varundubey`/junk password | idempotent error map, 401 message, AutoFill off (`1116066`) |
| Feed "Invalid parameter(s): sort" | Home sent `popular/latest` to `/feed` (enum `hot|new|top`) | `FeedSort` type + fallback mapping + page dedupe (`460a4e1`) |
| "app password not working" | wrong username (`admin`, not `varundubey`); App Passwords work fine | diagnosis only — no code bug |
| Analytics Export always 400 (pro) | app sent `format=json`, server enum is csv-only | request `csv` (body is shared, not parsed) (`f51db65`) |
| Announcements feature dead (pro) | wrong namespace `jetonomy/v1/site-announcements` (404) | member → `jetonomy/v1/announcements/active`; admin → new `proClient` + `{pins}` shape; type reconciled (`f51db65`) |
| Digest UI hidden (pro) | hardcoded `DIGEST_ENDPOINT_AVAILABLE=false` | flipped true — route ships in 1.6.0 (`f51db65`) |

**Live API contract sweep (free + pro): ~75 GET variants + 13 mutation probes against forums.local. Free = 0 bugs. Pro = 3 bugs, all fixed above.**

## 3. Roadmap (priority order)

### Track 1 — Finish live-verifying the app *(autonomous, highest value)*
Walk every remaining screen in the simulator against forums.local, screenshot, fix each app↔plugin contract mismatch (the sort bug proves more exist). Order: post detail → vote/reply → compose → spaces → profile → notifications → search → messaging → reactions → polls → badges → admin. Output: per-screen verified, bugs fixed + pushed.

### Track 2 — Plugin 1.6.0 → release-ready *(autonomous)*
Run contract-audit + qa-coverage + `jetonomy-smoke`; bump free+pro to 1.6.0 (lockstep), changelog (WooCommerce action-prefix style), refresh both manifests, tag + release. Gate: green smoke.

### Track 3 — Laravel builder → run it *(autonomous)*
`bin/up.sh` in Docker, verify branding editor + `build-config` JSON live, wire `build.yml` for a real model-A branded build trigger end-to-end.

### Track 4 — Distribution *(needs owner accounts/device)*
- Native push delivery: real device + `eas build --profile development`.
- Store builds: Apple Developer ($99) + Google Play ($25) → `eas build`/`eas submit`.
- Model-B white-label submit: per-customer store creds (already scaffolded in app-server §12).

## 4. Deployment state (this machine)

- forums.local active plugins are on **`1.6.0-dev`** (free + pro). To restore stable: `git checkout 1.5.0-dev` in both plugin dirs.
- App run/sim setup recorded in agent memory `jetonomy-app-run-setup`. EAS project `wbcomdesigns/jetonomy` (projectId `6722521e-…`).
- Dev login: `admin` + a WP Application Password (generate at forums.local/wp-admin → Users → Profile).
