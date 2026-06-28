# Build Your Own App

Publishing the Jetonomy App under your own name means your community gets a real, store-listed app — with your branding on the launcher icon, your developer name in the store listing, and complete ownership.

This is a one-time setup. Once the app is in the stores, updates can go out over-the-air without resubmitting (see [What Else You Can Do](What-Else-You-Can-Do)).

---

## Accounts you need (one-time cost)

| Account | Cost | Where to sign up |
|---------|------|-----------------|
| Expo account (free) | Free | [expo.dev](https://expo.dev) |
| Apple Developer Program | $99/year | [developer.apple.com](https://developer.apple.com/programs/) |
| Google Play Developer | $25 one-time | [play.google.com/console](https://play.google.com/console/signup) |

> The Apple and Google fees are paid to Apple and Google, not to Expo or Wbcom. Apple's $99/year is a requirement for any iOS app — there's no way around it. The $25 Google fee is a one-time payment for a lifetime developer account.

---

## The two parts of Expo — framework vs. cloud

The app is built with **Expo** (the React Native framework — free, open source, always free). Building and submitting the app to the stores can be done in two ways:

- **EAS (Expo Application Services):** Expo's paid cloud build service. Convenient — no Mac or Xcode required for the build step. Free tier available; paid plans add build concurrency and priority.
- **Local build tools:** Build entirely on your own computer using Xcode (Mac, required for iOS) and Android Studio. Free, but requires more setup.

Most community owners use EAS for convenience. Both routes produce the same end result.

---

## Option A — Build with EAS (recommended)

### Prerequisites

- Node.js 18 or later
- The repository cloned and dependencies installed (see [Try the App](Try-the-App))
- An Expo account

### Steps

**1. Install the EAS CLI**

```bash
npm install -g eas-cli
```

**2. Log in to your Expo account**

```bash
eas login
```

**3. Link the project to your Expo account**

```bash
eas init
```

This registers the project under your Expo account. The EAS project ID will be saved in `app.json`.

**4. Build for both platforms**

```bash
eas build --profile production --platform all
```

EAS builds the app in the cloud. You'll receive a link to track progress. When the build finishes, you download the `.ipa` (iOS) and `.aab` (Android) files.

> **First iOS build?** EAS will walk you through connecting your Apple Developer account and creating the required signing certificates and provisioning profiles. Follow the prompts — it's automated.

**5. Submit to the stores**

```bash
eas submit
```

EAS guides you through uploading to App Store Connect (Apple) and the Google Play Console. You will still need to fill in the store listing (screenshots, description, age rating) inside each store's own dashboard before Apple/Google approves the app.

---

## Option B — Build on your own computer (no EAS cloud)

If you prefer not to use EAS's cloud service, you have full control with local tooling.

| Method | What you need | Notes |
|--------|--------------|-------|
| `eas build --local` | Mac with Xcode (for iOS); any OS with Android Studio | Runs the EAS build process locally instead of in the cloud |
| `npx expo prebuild` then build in Xcode / Android Studio | Mac + Xcode (iOS); any OS + Android Studio (Android) | Generates native iOS and Android project folders you manage yourself |
| CI/CD pipeline (GitHub Actions, Codemagic, Fastlane) | Mac runner for iOS builds | Automates the build on every push; Codemagic has a free tier |

All three options are completely free beyond the Apple and Google developer account fees.

> **iOS requires a Mac.** Apple requires that iOS apps are compiled on macOS using Xcode. This applies to both EAS local and self-managed builds — there is no way to build an iOS `.ipa` without a Mac (or a Mac-based CI runner). EAS cloud handles this transparently for you if you use Option A.

---

## Customize before you build

Before building, update `app.json` (or `app.config.js`) in the repository to set:

- `name` — the app name shown in the phone's launcher
- `slug` — a URL-safe identifier
- `ios.bundleIdentifier` — for example `com.yourcompany.communityapp`
- `android.package` — for example `com.yourcompany.communityapp`
- `icon` — your custom home-screen icon (1024 × 1024 px PNG, no transparency)
- `splash` — your custom splash/loading screen image

Change these before running `eas build`. These are the settings that appear in the App Store listing and on members' home screens.

---

## Prefer to have someone else do this?

The Wbcom team can handle the one-time build and submission setup for you.

Reach out through [store.wbcomdesigns.com/jetonomy](https://store.wbcomdesigns.com/jetonomy/) and ask about white-label app setup.

---

> **After publishing:** You can push code updates to members' phones without a new store submission using EAS Update. See [What Else You Can Do](What-Else-You-Can-Do).
