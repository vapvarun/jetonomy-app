# Jetonomy App — a mobile app for your community

Turn your [Jetonomy](https://store.wbcomdesigns.com/jetonomy/) WordPress community into a **mobile app**. Your members get a real iPhone/Android app for your forum — feed, posts, replies, votes, messages, and more — and it automatically shows **your** logo, colours, and community name.

You don't have to be a developer to brand it. You *do* need a little technical help (or us) to build and publish the app to the app stores.

> 📖 **New here? Start with the [Wiki](https://github.com/vapvarun/jetonomy-app/wiki)** — it has friendly, screenshot-style step-by-step guides for everything below.

---

## What you can do — at a glance

| What | Do you need a developer? | How long |
|---|---|---|
| **Brand the app** (logo, colours, name) | ❌ No — done in your WordPress admin | ~5 minutes |
| **Let members sign in** (Application Passwords) | ❌ No | ~2 minutes |
| **Try the app on a phone** | 🟡 Someone runs one command | ~15 minutes |
| **Publish your own branded app to the stores** | ✅ Yes (you, a developer, or us) | a few hours, one time |

---

## Part 1 — Brand your app (no coding, ~5 minutes)

Your app reads your branding straight from your WordPress site, so **you change it in WordPress and the app updates itself** — no rebuild needed.

In your WordPress admin:

**1. Set your community name**
- Go to **Jetonomy → Settings → General**
- In **Community Title**, type your community's name (e.g. *"Course Academy"*)
- Click **Save**

**2. Set your colour**
- Go to **Jetonomy → Settings → Appearance**
- Under **Color Palette**, click **Accent → Select Color** and pick your brand colour
- Click **Save**

**3. Add your logo** *(new)*
- Still on **Jetonomy → Settings → Appearance**
- In the **Logo** box, paste the web address (URL) of your logo image
  - *Tip: upload your logo in WordPress (Media → Add New), open it, and copy its "File URL".*
  - Best results: a transparent PNG, at least 512px on the longest side
- Click **Save**

That's it. The next time the app connects to your site, it shows your name, colour, and logo — including on the sign-in screen.

---

## Part 2 — How signing in works (admins **and** members)

There is **no separate "connect your site" step for admins**. Everyone — you and your members — signs in the same way, and WordPress decides who can do what.

**The site address**
- In the **generic app**: each person types their community's web address (e.g. `https://yourcommunity.com`) once.
- In your **own white-label app** (Part 4): the address is **baked in** — members never type it; they just open your app and log in.

**The login (everyone)** — uses a **WordPress Application Password** (a safe, built-in WordPress feature, *not* your normal password). Each person creates their own:

1. Log into your site's WordPress admin
2. Go to **Users → Profile** (scroll to the bottom)
3. Find **Application Passwords**, type a name like `My Phone`, and click **Add New Application Password**
4. WordPress shows a code like `abcd efgh ijkl mnop` — copy it
5. In the app: enter the **site address** (if asked), your **username**, and paste that **code**

**Admins vs members** — the app reads each person's role from WordPress automatically:
- **Admins & moderators** also get a **Manage** area (moderation queue, flags, announcements, analytics).
- **Members** see the community (feed, posts, spaces, messages).

So being an admin in WordPress *is* the connection — there's nothing extra to set up. You can revoke any app password anytime from the same screen, without changing your real password.

---

## Part 3 — Try the app on a phone (one command)

The easiest way to see it running before publishing. A developer (or you, following along) does this once:

1. Install **[Expo Go](https://expo.dev/go)** on your phone (free, from the App Store / Play Store)
2. On a computer with [Node.js](https://nodejs.org) installed:
   ```bash
   git clone https://github.com/vapvarun/jetonomy-app.git
   cd jetonomy-app
   npm install
   npx expo start
   ```
3. Scan the QR code that appears with **Expo Go** (Android) or the **Camera app** (iPhone)
4. Sign in with your site address + an Application Password (Part 2)

*(Native push notifications need a full build — see Part 4.)*

---

## Part 4 — Publish your own branded app (one time, technical)

This puts **your own app**, with your icon and name, on the App Store and Google Play under **your own** developer accounts. You can do this yourself, ask a developer, or have us set it up once.

**You provide (one time):**
- A free **[Expo](https://expo.dev)** account
- An **Apple Developer** account ($99/year) — for the App Store
- A **Google Play** account ($25 one time) — for the Play Store

**Then build & submit** (full walkthrough in **[EAS-SETUP.md](./EAS-SETUP.md)** and the [Wiki](https://github.com/vapvarun/jetonomy-app/wiki/Build-Your-Own-App)):
```bash
npm i -g eas-cli
eas login
eas init
eas build --profile production --platform all
eas submit --platform all
```

Expo builds and signs the app in the cloud; you own the result.

> 💡 **Not technical?** You only need to *create* the three accounts above (just sign-ups). Then a developer — or our team as a one-time setup service — does the rest and hands you the live app.

### Don't want to use Expo's cloud builds?

The app is **built with** Expo (the framework), but you don't have to use **EAS** (Expo's paid cloud build service). Free alternatives:

| Option | What it does |
|---|---|
| `eas build --local` | Same command, builds on **your own Mac** instead of the cloud (free; needs Xcode) |
| `npx expo prebuild` then **Xcode + Android Studio** | Generates standard native iOS/Android projects you build, sign, and submit yourself — like any native app |
| **Fastlane / Codemagic / GitHub Actions** | Open-source / CI tools that build + submit the native projects without EAS |

What you still need either way (Apple's rules, not Expo's): a **Mac with Xcode** for iOS, and the **Apple ($99) + Google ($25)** accounts to publish. EAS just turns all of that into one command. Full comparison in the [Wiki → Building Without EAS](https://github.com/vapvarun/jetonomy-app/wiki/Build-Your-Own-App).

---

## What else you can do

Once members are in the app, they (and you) can:

- 📰 **Browse the feed** across all spaces, sort by Hot / New / Top
- ✍️ **Post, reply, and vote**; accept answers in Q&A spaces
- 🧩 **Join spaces** (forums, Q&A, idea boards) and follow topics
- 🔔 **Get notifications** for replies, mentions, and more
- 💬 **Private messaging** *(with Jetonomy Pro)*
- 😀 **Reactions, polls, badges, custom fields** *(with Jetonomy Pro)*
- 📱 **Native push notifications** *(with Jetonomy Pro + a published build)*
- 🌐 **Belong to several communities** — the app remembers multiple sites
- 🛡️ **Moderate from your phone** (if you're an admin/moderator)

Everything respects your site's settings and Pro features — turn an extension on in WordPress, it appears in the app.

---

## Frequently asked questions

**Do my members need a developer or an Expo account?**
No. Members just install the app and sign in. Only *publishing* the app needs the accounts in Part 4.

**Is the Application Password my normal password?**
No — it's a separate, revocable code. Your real password is never entered in the app.

**Do I need Jetonomy Pro?**
No for the basics (feed, posts, votes, spaces). Pro adds messaging, reactions, polls, badges, custom fields, and push.

**My branding isn't showing in the app.**
Make sure your site runs **Jetonomy 1.6.0 or newer** (the branding feature), and that you saved the settings in Part 1. Older sites still work with default styling.

**Can one app serve many communities?**
Yes. Each member enters their own community's address; the app brands itself per site.

**Where are the detailed guides?**
The **[Wiki](https://github.com/vapvarun/jetonomy-app/wiki)** — step-by-step pages for branding, sign-in, trying the app, building, and troubleshooting.

---

## For developers

- **Stack:** Expo SDK 52 + TypeScript, Expo Router, Zustand, React Query, NativeWind.
- **Auth:** WordPress Application Passwords (core) — no JWT, no token plugin.
- **Backend:** the `jetonomy/v1` REST API on each user's WordPress site; per-site branding via `GET /app/config`.
- **Architecture & full endpoint coverage:** [`docs/micro-plan/00-MASTER-PLAN.md`](./docs/micro-plan/00-MASTER-PLAN.md)
- **Build & submit:** [`EAS-SETUP.md`](./EAS-SETUP.md) · **Run locally:** [`RUN.md`](./RUN.md)

```
app/         Screens (auth, tabs, post, space, conversation, manage…)
api/         Typed REST client + per-domain modules
components/  PostCard, ReplyItem, VoteButton, ReactionBar, PollView…
theme/       Per-site theming from /app/config
```

## License

GPL-2.0-or-later (matches the Jetonomy plugin). Contributions and issues welcome.
