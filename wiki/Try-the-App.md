# Try the App

You can see the full Jetonomy App experience on a real phone **without publishing anything to the App Store or Google Play**. All you need is Expo Go (a free app) and a computer with Node.js.

This is the fastest way for you and your team to evaluate the app before deciding whether to do a full branded build.

> **What Expo Go is:** It's a free app from Expo that can run React Native apps directly from source code during development. Think of it as a live preview window for the app.

---

## What you need

| Requirement | Notes |
|-------------|-------|
| A phone (iPhone or Android) | Any reasonably modern device works |
| Expo Go app | Free on [App Store](https://apps.apple.com/app/expo-go/id982107779) and [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent) |
| A computer | Mac, Windows, or Linux |
| Node.js | Version 18 or later — download from [nodejs.org](https://nodejs.org) |
| Git | To clone the repository |

Your phone and computer must be on the **same Wi-Fi network**.

---

## Step-by-step

### 1. Install Expo Go on your phone

Search for **Expo Go** in the App Store or Google Play and install it. It's free.

### 2. Clone the app repository

Open a terminal on your computer and run:

```bash
git clone https://github.com/vapvarun/jetonomy-app.git
cd jetonomy-app
```

### 3. Install dependencies

```bash
npm install
```

This downloads the packages the app needs. It takes a minute or two the first time.

### 4. Start the development server

```bash
npx expo start
```

Expo prints a QR code in your terminal window.

### 5. Open the app on your phone

- **Android:** Open Expo Go, tap **Scan QR code**, and scan the QR code from your terminal.
- **iPhone:** Open the built-in **Camera** app, point it at the QR code, and tap the notification that appears. The app opens in Expo Go automatically.

The app will load on your phone in a few seconds.

### 6. Sign in

On the sign-in screen, enter:

- **Site Address:** your Jetonomy community URL
- **Username:** your WordPress username
- **Password:** your Application Password (see [Signing In](Signing-In) if you haven't created one yet)

You're in. Browse your community, post a reply, check notifications — everything works the same as it will in a published app.

---

## Things to know about the Expo Go preview

| Topic | Details |
|-------|---------|
| **Push notifications** | Native push notifications do not work in Expo Go. They require a real device build. See [Build Your Own App](Build-Your-Own-App). |
| **Performance** | Expo Go adds a small overhead. A real build will feel faster and snappier. |
| **Sharing with teammates** | Anyone on the same Wi-Fi network can scan the QR code and open the app. |
| **No account needed** | You don't need an Expo account just to run the app in Expo Go. |

---

## Troubleshooting the preview

| Problem | Fix |
|---------|-----|
| QR code doesn't scan | Make sure your phone and computer are on the same Wi-Fi network |
| "Network response timed out" | Your firewall may be blocking Expo's port; try running `npx expo start --tunnel` |
| App loads but sign-in fails | Check [FAQ and Troubleshooting](FAQ-and-Troubleshooting) |
| `npx expo start` fails | Confirm Node.js 18+ is installed: `node --version` |

---

> **Liked what you saw?** The next step is [Build Your Own App](Build-Your-Own-App) — publish it to the App Store and Google Play under your own accounts.
