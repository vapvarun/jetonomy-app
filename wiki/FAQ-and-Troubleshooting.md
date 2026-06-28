# FAQ and Troubleshooting

---

## General questions

### Do my members need to create an Expo account to use the app?

No. Expo Go is only used by you (the site owner) to preview the app during development. Your members install the published app from the App Store or Google Play and never interact with Expo at all.

### Is an Application Password the same as my real WordPress password?

No. An Application Password is a separate code that WordPress generates for you. Your real login password is never shared with or stored by the app. You can revoke an Application Password at any time without changing your main login.

### Do I need Jetonomy Pro to use the app?

No. The free Jetonomy plugin gives members access to the feed, spaces, posts, replies, voting, search, bookmarks, and notifications. Jetonomy Pro adds private messaging, reactions, polls, badges, custom fields, and native push notifications. See [Features](Features) for the full breakdown.

### Can one app serve multiple communities?

Yes. Members can be signed in to more than one Jetonomy community at the same time. The app lets you switch between communities from the account menu. Each community is a separate WordPress site with its own sign-in.

### Does Jetonomy run a central server that sees my community's data?

No. The app talks directly to your WordPress site's REST API (`/wp-json/jetonomy/v1/`). There is no Jetonomy cloud server in the middle. Your data stays on your own hosting.

---

## Branding questions

### I changed my community name / color / logo but the app still shows the old settings.

1. Confirm you clicked **Save Changes** in the Jetonomy Settings screen.
2. Confirm the Jetonomy plugin is version **1.6.0 or later** (earlier versions do not serve the `/app/config` endpoint).
3. Force-close the app on your phone and reopen it — the app fetches branding fresh on each launch.
4. Visit `https://yoursite.com/wp-json/jetonomy/v1/app/config` in your browser to confirm the endpoint returns your new values.

---

## Sign-in errors

### "This site isn't running Jetonomy"

The app couldn't find the Jetonomy REST API at the address you typed.

**Things to check:**

1. Confirm the URL is correct — include `https://` at the start.
2. Confirm the Jetonomy plugin is active on that site.
3. Go to **Settings → Permalinks** in WordPress and click **Save Changes** to flush rewrite rules.
4. Visit `https://yoursite.com/wp-json/jetonomy/v1/spaces` in a browser — if you see JSON, the API is working. If you see a 404, the plugin may not be active.

### "Wrong username or application password"

1. Double-check you are using your WordPress **username**, not your email address or display name.
2. Confirm you copied the Application Password correctly. Spaces in the password are fine — paste it exactly as WordPress displayed it.
3. If you're not sure, go to your WordPress profile, revoke the old Application Password, and create a fresh one.

### Application Passwords section is missing from my profile

This usually means one of three things:

| Cause | Fix |
|-------|-----|
| Your site uses plain HTTP (not HTTPS) | WordPress disables Application Passwords on non-HTTPS sites by default. Switch your site to HTTPS. |
| A security plugin disabled Application Passwords | Check plugins like Wordfence, iThemes Security, or All-In-One Security. Look for a setting that disables REST API authentication or Application Passwords and turn it off. |
| WordPress version below 5.6 | Update WordPress. Application Passwords were introduced in WordPress 5.6. |

### "401 Unauthorized" or authentication keeps failing on a production site

Some server setups (especially on Apache) strip the `Authorization` header before it reaches PHP. This header is how Application Passwords work.

**Fix for Apache:** Add this to your `.htaccess` file (above the WordPress block):

```apache
SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
```

After saving, try signing in again. If you're on a managed host, contact your hosting support and ask them to allow the `Authorization` HTTP header to pass through to PHP.

---

## App and build questions

### Do members need to update the app when I change my community settings?

No. Branding (name, color, logo) and feature changes are fetched live from your site every time the app opens. Members do not need to update the app for these changes.

### The Expo QR code scan opens Expo Go but shows an error about the network

Your phone and computer must be on the same Wi-Fi network. If they are and it still fails, try:

```bash
npx expo start --tunnel
```

The `--tunnel` flag routes the connection through Expo's servers, bypassing local network restrictions.

### How do I revoke a member's app access?

1. Go to **Users → All Users** in your WordPress dashboard.
2. Click the member's username.
3. Scroll to **Application Passwords**.
4. Click **Revoke** next to the Jetonomy App password.

The app stops working for that member immediately. Their WordPress account and community membership remain intact.

---

## Still stuck?

- Search open issues or file a new one at [github.com/vapvarun/jetonomy-app/issues](https://github.com/vapvarun/jetonomy-app/issues).
- For Jetonomy plugin questions, contact Wbcom support through [store.wbcomdesigns.com/jetonomy](https://store.wbcomdesigns.com/jetonomy/).
