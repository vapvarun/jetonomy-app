// theme/branding.ts — app-level DEFAULT branding, used only as a first-paint
// fallback.
//
// The app is always multi-tenant: ALL live branding — accent color, logo, app
// name, dark-mode default — comes from the connected community's plugin REST
// API (Jetonomy 1.6.0+ `GET /app/config`, plus the core `/wp-json/` index).
// These constants are the neutral Jetonomy defaults shown for the very first
// paint (login screen, DEFAULT_APP_CONFIG) and on any /app/config 404 or parse
// failure, so every module can always `import` a value.
//
// Consumed by api/config.ts (DEFAULT_APP_CONFIG), stores/authStore.ts, and
// app/(auth)/login.tsx.

// NOTE: explicit widened types (string / boolean) keep the SITE_URL_HARDCODED
// branches type-checkable rather than narrowing to a `never` literal.

/** Seed accent the app derives its whole palette from until /app/config loads. */
export const ACCENT: string = '#3B82F6';

/** Default to dark mode when the device pref is "system" and no /app/config yet. */
export const DARK_MODE_DEFAULT: boolean = false;

/** Reserved single-site override. Always '' — the app is always multi-tenant. */
export const SITE_URL: string = '';

/**
 * Always false: the app is always multi-tenant, so the login screen asks for a
 * Site URL and runs site discovery. Reserved as the single gate for a possible
 * future single-site build; nothing sets it true today.
 */
export const SITE_URL_HARDCODED: boolean = false;

export const BRANDING = {
  accent: ACCENT,
  darkModeDefault: DARK_MODE_DEFAULT,
  siteUrl: SITE_URL,
  siteUrlHardcoded: SITE_URL_HARDCODED,
} as const;
