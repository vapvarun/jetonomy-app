// theme/branding.ts — build-time branding constants.
//
// This is the GENERIC (multi-tenant) default that ships in the public app:
// nothing is hardcoded, the login screen asks for a Site URL and runs site
// discovery. The Laravel white-label builder OVERWRITES this file via
// scripts/inject-branding.js to bake a single site + brand into one customer
// build (SITE_URL set, SITE_URL_HARDCODED = true, ACCENT branded).
//
// Foundation bootstrap (api/config.ts DEFAULT_APP_CONFIG, stores/authStore.ts
// hydrate, app/(auth)/login.tsx) consumes these so it can always `import` them.
// Keep this file's shape in sync with inject-branding.js → writeBranding().

// NOTE: explicit widened types (string / boolean) are intentional — the injector
// rewrites these values per build, so they must NOT narrow to literal types
// (that would make TS treat the white-label branches as unreachable `never`).

/** Seed accent the app derives its whole palette from until /app/config loads. */
export const ACCENT: string = '#3B82F6';

/** Default to dark mode when the device pref is "system" and no /app/config yet. */
export const DARK_MODE_DEFAULT: boolean = false;

/** Baked site URL for white-label builds. Empty in the generic app. */
export const SITE_URL: string = '';

/**
 * When true (white-label build) the login screen HIDES the Site URL field,
 * skips site discovery, and seeds a single session for SITE_URL. When false
 * (generic public app) the multi-site / site-discovery flow runs.
 */
export const SITE_URL_HARDCODED: boolean = false;

export const BRANDING = {
  accent: ACCENT,
  darkModeDefault: DARK_MODE_DEFAULT,
  siteUrl: SITE_URL,
  siteUrlHardcoded: SITE_URL_HARDCODED,
} as const;
