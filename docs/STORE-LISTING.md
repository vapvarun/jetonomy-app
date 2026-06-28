# Store Listing Kit — Jetonomy (generic app, POC)

Everything needed to publish the generic, multi-tenant **Jetonomy** app to the App Store and Google Play under Wbcom's developer accounts. Fill the blanks, drop in the assets, and submit with `eas submit`.

> This is the **generic** app (members enter their own community URL). White-label per-customer apps reuse this kit with the customer's own name/icon/accounts.

---

## 1. App identity

| Field | Value |
|---|---|
| App name (stores) | **Jetonomy** *(or "Jetonomy Communities")* |
| Subtitle / short (≤30 chars Apple / ≤80 Play) | `Your community, in your pocket` |
| Bundle ID (iOS) | `com.jetonomy.app` |
| Package (Android) | `com.jetonomy.app` |
| Category | **Social Networking** (Apple) / **Social** (Play) |
| Default language | English (US) |
| Price | Free |
| Publisher | Wbcom Designs |

## 2. Descriptions

**Short description (Google Play, ≤80 chars):**
> The official app for Jetonomy-powered communities, forums, and Q&A.

**Full description (App Store + Play):**
> Jetonomy turns any Jetonomy-powered WordPress community into a fast, native mobile app. Sign in to your community and stay connected on the go.
>
> • Browse the feed across all your spaces — sort by Hot, New, or Top
> • Post topics and questions, reply in threads, and upvote the best answers
> • Join forums, Q&A spaces, and idea boards
> • Get notified about replies, mentions, and more
> • Private messaging, reactions, polls, and badges (where the community has Jetonomy Pro)
> • Belong to several communities and switch between them in one app
> • Works offline — your last-seen content is there even without a connection
>
> Your community lives on its own WordPress site. The app connects directly to it using WordPress's built-in, secure Application Passwords — no middleman, no extra account. You own your data.
>
> Run your own community? Get Jetonomy at https://store.wbcomdesigns.com/jetonomy/

**Keywords (Apple, ≤100 chars, comma-separated):**
> community,forum,discussion,Q&A,WordPress,messaging,groups,social,bbpress,reddit

## 3. Required URLs

| Field | Value |
|---|---|
| Support URL | https://store.wbcomdesigns.com/support/ |
| Marketing URL | https://store.wbcomdesigns.com/jetonomy/ |
| **Privacy Policy URL** (required by both) | `https://wbcomdesigns.com/privacy-policy/` — confirm it covers this app |

## 4. Visual assets checklist

**App icon**
- [ ] 1024×1024 PNG, no alpha, no rounded corners (stores round it). Source: `assets/icon.png`.

**Screenshots** (use the simulator/device; show real screens):
- [ ] **iPhone 6.7"** (1290×2796) — 3–6 shots **(required)**
- [ ] **iPhone 6.5"** (1242×2688) — recommended
- [ ] **iPad 12.9"** — only if you mark iPad support
- [ ] **Android phone** (min 1080×1920) — 2–8 shots **(required)**
- [ ] **Play feature graphic** — 1024×500 PNG **(required by Play)**

Suggested screens to capture: **branded login**, **home feed**, **post + replies/votes**, **spaces list**, **notifications**, **profile**.

## 5. Privacy / data declarations

Answer these honestly in App Store Connect (Privacy) and Play Console (Data safety):

- **Data collected by the app itself:** none for analytics/ads. The app stores the member's **Application Password locally on the device** (encrypted, SecureStore) to stay signed in; it is sent only to the member's own community site.
- **Third-party SDKs:** none for tracking/ads. (Expo/React Native runtime only.)
- **Account / content data** (posts, profile) lives on the **member's own WordPress site**, not on any Wbcom/Jetonomy server.
- **Tracking:** No. **Ads:** No.
- **Account deletion:** members manage their account on their own WordPress site; in-app they sign out / remove the community (revokes the device's app password). State this in the listing per store policy.

## 6. iOS specifics

- `ITSAppUsesNonExemptEncryption` is already set to `false` in `app.json` (standard HTTPS only).
- First iOS build/submit needs the **Apple Developer account** logged in (Expo prompts) + an **App Store Connect** app record (`eas submit` can create it).

## 7. Submit

```bash
# Android — upload the built .aab to a Play internal-testing track first
eas submit --platform android --latest

# iOS — build then submit (Apple account required)
eas build --platform ios --profile production
eas submit --platform ios --latest
```

Fill `eas.json` → `submit.production` with the real `ascAppId` / `appleTeamId` (iOS) and the Google Play **service-account JSON** path (Android) before submitting.

## 8. Pre-submit checklist

- [ ] App name + descriptions finalized
- [ ] Privacy policy URL live and accurate for this app
- [ ] Icon + all required screenshots + Play feature graphic uploaded
- [ ] Data-safety / privacy answers completed
- [ ] Apple ($99/yr) + Google Play ($25) accounts active
- [ ] Production build green (Android `.aab` / iOS `.ipa`)
- [ ] Content rating questionnaire done (Play) / age rating (Apple)
- [ ] Test the build on a real device before submitting for review
