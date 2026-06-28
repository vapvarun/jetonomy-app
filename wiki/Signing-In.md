# Signing In

Everyone — site owners, admins, moderators, and members — signs in the same way: with their **WordPress username** and an **Application Password**.

There is no separate "connect your site" step for admins. There is no Jetonomy account to create. You sign in with credentials that already exist on your WordPress site.

---

## What is an Application Password?

An Application Password is a special code that WordPress generates for you. It is:

- **Not your real WordPress password** — you can delete it any time without affecting your login
- **Specific to one app or device** — you can create as many as you like and revoke them individually
- **Built into WordPress** — no plugin needed; it's been in WordPress since version 5.6

Think of it like giving a spare key to a trusted app. If you ever want to remove the app's access, you delete that one key — your main password stays the same.

---

## How to create an Application Password

### For site owners and admins

1. Log in to your WordPress dashboard.
2. Go to **Users → Profile**.
   - Or: hover over your name in the top-right corner and click **Edit Profile**.
3. Scroll down until you see the **Application Passwords** section.
4. In the **New Application Password Name** box, type a label so you remember what it's for. Example: `Jetonomy App – iPhone`.
5. Click **Add New Application Password**.
6. WordPress displays a password that looks like: `AbCd EfGh IjKl MnOp QrSt UvWx`
7. **Copy this code now.** WordPress will never show it again.
8. Open the Jetonomy App on your phone, enter your site URL and username, and paste this code as the password.

> **Where to find the Application Passwords section?**
> If you don't see it, your WordPress site may be using plain HTTP instead of HTTPS, or a security plugin may have disabled Application Passwords. See [FAQ and Troubleshooting](FAQ-and-Troubleshooting) for help.

### For members

Share these instructions with your members. Each person creates their own Application Password on their own WordPress profile — they do not need any special permissions.

1. Go to your community site and log in with your regular username and password.
2. Click your name/avatar in the top navigation to open your profile, then find the link to **Edit Profile**. (The exact location depends on the theme.)
3. Scroll down to **Application Passwords**.
4. Name it something like `Jetonomy App`.
5. Click **Add New Application Password** and copy the code.
6. Open the Jetonomy App, enter the site URL, your username, and paste the code.

---

## What to type in the sign-in screen

| Field | What to enter |
|-------|--------------|
| Site Address | Your community's URL — for example `https://mycommunity.com`. Include `https://`. |
| Username | Your WordPress username (not your display name or email — the username you use to log in) |
| Password | The Application Password you just created (spaces in the code are fine; type or paste them as shown) |

> **White-label builds:** If you published a custom build of the app for your community (see [Build Your Own App](Build-Your-Own-App)), the Site Address field may already be pre-filled or hidden. Members just enter their username and Application Password.

---

## Roles are automatic

The app checks your WordPress role when you sign in. You don't configure anything separately.

| WordPress role | What you see in the app |
|----------------|------------------------|
| Administrator | Full community feed + **Manage** area (moderation queue, flags, announcements, analytics) |
| Moderator (editor or custom mod role) | Community feed + **Manage** area |
| Member / Subscriber | Community feed, spaces, profile, notifications |

---

## Revoking access

If a member loses their phone or you want to remove someone's app access:

1. Go to **Users → All Users** in your WordPress dashboard.
2. Click the person's username to open their profile.
3. Scroll to **Application Passwords**.
4. Find the password named for the Jetonomy App and click **Revoke**.

The app will stop working for that person immediately. Their WordPress account and community membership are unaffected.

---

> **Trouble signing in?** See [FAQ and Troubleshooting](FAQ-and-Troubleshooting) for common error messages and fixes.
