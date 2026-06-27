# EAS Setup — Jetonomy App

This repo is **EAS-ready but not EAS-initialized**: `eas.json` (build + submit profiles)
and the `app.json` `expo.extra.eas.projectId` placeholder ship in the tree, but no
Expo account, project id, or store credentials are baked in. Everything below is
**one command away** once the owner has the right accounts.

> The app runs and bundles today without any of this (`npx expo start`,
> `npx tsc --noEmit`, `npx expo export`). EAS is only needed to produce installable
> dev/preview builds and to submit to the App Store / Play Store.

---

## 0. One-time: tools + account

```bash
npm i -g eas-cli          # install the EAS CLI globally
eas login                 # log in to your Expo account (create one at expo.dev if needed)
eas whoami                # confirm you're logged in
```

**Needs:** a free **Expo account** (https://expo.dev). For an organization build,
create/own an **Expo org** and use its slug as `expo.owner`.

---

## 1. Initialize the project (fills projectId + owner)

```bash
cd /path/to/jetonomy-app
eas init                  # creates the EAS project, writes a real projectId
```

`eas init` does two things to `app.json`:

1. sets `expo.extra.eas.projectId` to the real id (replaces `REPLACE_VIA_eas_init`).
2. sets `expo.owner` to your account/org slug (the `ownerNote` in `extra` is just a
   reminder — there is no literal `owner` key until `eas init` writes it, or you can
   add it by hand: `"owner": "your-expo-username-or-org"`).

Until this runs, push registration treats the placeholder projectId as "no projectId"
and no-ops gracefully (`utils/push.ts`), so dev builds still run.

---

## 2. Build profiles (`eas.json`)

| Profile | Purpose | Command |
|---|---|---|
| `development` | Dev client, internal distribution, iOS simulator allowed | `eas build --profile development --platform ios` |
| `preview` | Internal QA build (TestFlight-style / APK), no dev client | `eas build --profile preview --platform all` |
| `production` | Store build, auto version increment | `eas build --profile production --platform all` |

First run, for **the first internal dev build**:

```bash
eas build --profile development --platform ios     # or: --platform android
```

EAS will prompt to **generate signing credentials** the first time:
- **iOS:** needs an **Apple Developer account** ($99/yr) for real-device/TestFlight/store
  builds. Simulator builds (`development`, `ios.simulator: true`) need **no** Apple account.
- **Android:** EAS can generate a keystore for you (no Google account needed for an
  internal APK). A Play Store submission needs a **Google Play Developer account** ($25 once).

Manage credentials anytime:

```bash
eas credentials
```

---

## 3. Store submission (`submit.production` in `eas.json`)

Fill the placeholders in `eas.json` → `submit.production` with **customer-supplied** values:

### iOS — needs an Apple Developer account
- `ascAppId` — the App Store Connect **app id** (numeric), from the app record you
  create at https://appstoreconnect.apple.com.
- `appleTeamId` — your 10-character **Apple Developer Team ID** (Membership page).
- Apple ID login is supplied at submit time via the `eas submit` prompt, or
  `EXPO_APPLE_ID` env var / an EAS secret + an app-specific password.

```bash
eas submit --profile production --platform ios
```

### Android — needs a Google Play Developer account
- `serviceAccountKeyPath` — path to a **Google Play service-account JSON** key with
  release permissions (Play Console → Setup → API access → create service account →
  grant "Release to production / testing"). Store it OUTSIDE git; reference its path
  or load it as an EAS secret.
- `track` — `internal` | `alpha` | `beta` | `production`.

```bash
eas submit --profile production --platform android
```

---

## 4. OTA updates (optional, recommended)

```bash
eas update:configure
eas update --branch production --message "Fix X"
```

Channels are pre-wired in `eas.json` (`development` / `preview` / `production`).

---

## 5. White-label builds (per-customer)

The Laravel builder (`jetonomy-app-server`) runs `node scripts/inject-branding.js
customer-config.json` to bake `SITE_URL` + branding into `theme/branding.ts` and
`app.json`, then runs the same `eas build` / `eas submit` — but under the **customer's
own** Apple/Google developer accounts (App Store guideline 4.3 requires the publisher
to be the customer). Each customer supplies their own:
- Expo account/org (or uses a shared org with per-app slugs),
- Apple Developer account (`ascAppId` + `appleTeamId`),
- Google Play service-account JSON.

---

## What remains BLOCKED until accounts exist

| Step | Blocked on | Exact command / value needed |
|---|---|---|
| `eas login` / `eas init` | **Expo account** | `eas login`, then `eas init` (writes real `projectId` + `owner`) |
| Real-device / TestFlight iOS build | **Apple Developer account** ($99/yr) | `eas build --profile preview --platform ios` (prompts for credentials) |
| App Store submit | Apple account + `ascAppId` + `appleTeamId` | fill `eas.json submit.production.ios`, then `eas submit --platform ios` |
| Play Store submit | **Google Play account** ($25) + service-account JSON | fill `serviceAccountKeyPath`, then `eas submit --platform android` |
| Live push token (`getExpoPushTokenAsync`) | real `projectId` (from `eas init`) **and** a real device or dev build | `eas init` + `eas build --profile development` on a device |

iOS **simulator** dev builds and Android **internal** APKs need **no** paid account —
only an Expo login.
