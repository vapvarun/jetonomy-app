# Branding Your App

You control three things that make the app feel like yours: the **community name**, the **accent color**, and your **logo**. All three are set in your WordPress dashboard — no code, no rebuilding the app.

> **Requires Jetonomy 1.6.0 or later.** Update the plugin before following these steps.

---

## How branding works

When the app starts, it calls a public endpoint on your site:

```
GET https://yoursite.com/wp-json/jetonomy/v1/app/config
```

That endpoint returns your community name, accent color, and logo URL. The app reads these values every time it opens and applies them immediately. No app update needed — change the settings in WordPress and the app reflects them within seconds.

> **Important distinction — runtime branding vs. the home-screen icon**
>
> Runtime branding (this page) themes the *inside* of the app: the name shown on the login screen, the accent color throughout the UI, and your logo on the login screen.
>
> The **home-screen icon and app name** that appear on a member's phone launcher are baked into the app binary. Those only change with a white-label build (see [Build Your Own App](Build-Your-Own-App)). For most communities, runtime branding is all you need.

---

## Setting your Community Title (app name)

This is the name displayed on the app's login screen and throughout the interface.

1. In your WordPress dashboard, go to **Jetonomy → Settings → General**.
2. Find the **Community Title** field.
3. Type your community's name (for example: `The Makers Hub`).
4. Click **Save Changes**.

The app will show this name the next time it loads.

---

## Setting your Accent Color

The accent color themes buttons, links, active states, and highlights throughout the entire app.

1. Go to **Jetonomy → Settings → Appearance**.
2. Open the **Color Palette** section.
3. Click the **Accent** color swatch.
4. Pick your color using the color picker, or type a hex code (for example: `#E85D26`).
5. Click **Save Changes**.

**Tips:**
- Choose a color with enough contrast against white backgrounds so text stays readable.
- Your brand's primary color usually works well here.

---

## Setting your Logo

*Available in Jetonomy 1.6.0 and later.*

Your logo appears on the app's login screen — the first thing members see when they open the app.

1. Go to **Jetonomy → Settings → Appearance**.
2. Find the **Logo** section.
3. Click **Upload Logo** (or **Select Image** if a logo is already set).
4. Choose an image from your Media Library or upload a new one.
5. Click **Save Changes**.

**Logo tips:**

| Recommendation | Why it matters |
|----------------|---------------|
| Use a PNG with a transparent background | Looks clean on any background color |
| Minimum 200 × 200 px | Looks sharp on high-resolution phone screens |
| Square or horizontal logos work best | Avoid very wide or very tall aspect ratios |

---

## Checking that branding is live

After saving, you can verify the endpoint is returning your settings by visiting this URL in your browser (replace with your actual site domain):

```
https://yoursite.com/wp-json/jetonomy/v1/app/config
```

You should see a JSON response with `app_name`, `accent_color`, and `logo_url` fields. If you see `"Cannot GET"` or a 404, make sure Jetonomy 1.6.0 or later is active and your WordPress permalinks are set to anything other than Plain (**Settings → Permalinks → Save Changes** to flush rewrite rules).

---

## Troubleshooting branding

| Symptom | What to check |
|---------|--------------|
| App still shows "Jetonomy" as the name | Confirm you saved the Community Title setting; confirm plugin is 1.6.0+ |
| Accent color not updating | Force-close the app and reopen it; the config is fetched fresh on each launch |
| Logo not appearing | Check the logo is a publicly accessible URL — visit the logo URL in an incognito browser tab |
| `/app/config` returns 404 | Go to **Settings → Permalinks** and click **Save Changes** to flush rewrite rules |

---

> **Next step:** Share the app with your members — see [Signing In](Signing-In) for the member guide.
