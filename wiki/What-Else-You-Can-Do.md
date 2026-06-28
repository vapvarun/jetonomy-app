# What Else You Can Do

Once your app is running, there are several ways to go further — from push notifications to open-source customization.

---

## Brand the app per site

Each WordPress site running Jetonomy can have its own Community Title, accent color, and logo. If you run multiple communities, each one appears in the app with its own look. Members can be signed in to all of them at the same time.

See [Branding Your App](Branding-Your-App) for setup steps.

---

## Run multiple communities from one app

The app supports signing in to more than one Jetonomy site. Members switch between communities from the account menu — no separate app install needed for each community.

---

## Publish a white-label app for your community

If you want your community's name and icon on the App Store — not "Jetonomy" — you publish your own build under your own Apple and Google developer accounts. Your members download an app that looks entirely yours.

See [Build Your Own App](Build-Your-Own-App) for the step-by-step process.

---

## Moderate from your phone

Admins and moderators get a **Manage** tab in the app with the moderation queue, reported content, and community announcements. You can review flags and approve or remove content without opening a laptop.

---

## Native push notifications

With Jetonomy Pro's Push Notifications extension enabled and a real app build (not Expo Go), members receive native push alerts on their lock screen for replies, mentions, votes, and more.

Push notifications do not require any third-party notification service — they're handled through Expo's push infrastructure and delivered directly to each device.

---

## Push app updates without resubmitting to the stores

Once your app is published, you can ship JavaScript and asset updates to members' phones **without going through App Store or Google Play review** using EAS Update.

```bash
eas update --branch production --message "New reply sorting options"
```

Members get the update automatically the next time they open the app. You only need to submit a new binary to the stores when you update native code (which is rare).

This makes it practical to ship improvements frequently without the typical 1-3 day App Store review cycle.

---

## Customize and extend the app (open source)

The Jetonomy App is open source under the GPL-2.0-or-later license. You can:

- Change the UI — fonts, layout, spacing, screen structure
- Add new screens or integrate additional Jetonomy REST endpoints
- Remove features you don't need
- Translate the interface into other languages

The source code is at [github.com/vapvarun/jetonomy-app](https://github.com/vapvarun/jetonomy-app). Pull requests and issues are welcome.

---

## Contribute to the project

Found a bug? Have a feature idea? The app is community-driven.

- **Report a bug:** [github.com/vapvarun/jetonomy-app/issues](https://github.com/vapvarun/jetonomy-app/issues)
- **Submit a pull request:** Fork the repo, make your change, and open a PR against `main`
- **Request a feature:** Open an issue with the label `enhancement`

---

## Get help from the Wbcom team

The Wbcom team built and maintains both the Jetonomy plugin and the mobile app.

- **Plugin and app support:** [store.wbcomdesigns.com/jetonomy](https://store.wbcomdesigns.com/jetonomy/)
- **White-label build setup:** Contact Wbcom if you'd like the team to handle the one-time App Store and Google Play submission
- **GitHub:** [github.com/vapvarun/jetonomy-app](https://github.com/vapvarun/jetonomy-app)

---

> **Back to the beginning:** [Home](Home) | [Getting Started](Getting-Started)
