// utils/appPasswordAuth.ts — WP-core Application Passwords "authorize" connect flow.
//
// Primary "Connect" path (no JWT, no nonces — see 01-foundation-auth.md §0):
//   open {siteUrl}/wp-admin/authorize-application.php in an auth session ->
//   the member approves in their real WP login -> WP redirects to
//   <scheme>://auth?site_url=&user_login=&password= -> we parse those params
//   (urldecoded) and hand them back. The caller validates the App Password via
//   GET /wp/v2/users/me?context=edit and stores it through authStore.signIn.
//
// Manual app-password entry stays available as a fallback on the login screen.

import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_ID_KEY = 'jetonomy.app_id';
export const APP_NAME = 'Jetonomy';

/** App scheme from app.json (expo.scheme). Falls back to 'jetonomyapp'. */
export function appScheme(): string {
  const scheme = Constants.expoConfig?.scheme;
  if (typeof scheme === 'string' && scheme) return scheme;
  if (Array.isArray(scheme) && scheme.length > 0) return scheme[0];
  return 'jetonomyapp';
}

/** The deep link WP redirects back to on approve/reject: <scheme>://auth */
export function authRedirectUrl(): string {
  return `${appScheme()}://auth`;
}

/** RFC4122-ish v4 UUID without a native crypto dependency. */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Stable per-install app_id (UUID), persisted so WP shows ONE consistent
 * Application Passwords entry across reconnects instead of a new row each time.
 */
export async function getAppId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(APP_ID_KEY);
    if (existing) return existing;
    const id = uuidv4();
    await AsyncStorage.setItem(APP_ID_KEY, id);
    return id;
  } catch {
    return uuidv4();
  }
}

/** Build the WP authorize-application URL with a stable app_id + redirect. */
export function buildAuthorizeUrl(siteUrl: string, appId: string): string {
  const base = siteUrl.replace(/\/+$/, '');
  const redirect = authRedirectUrl();
  const query = [
    `app_name=${encodeURIComponent(APP_NAME)}`,
    `app_id=${encodeURIComponent(appId)}`,
    `success_url=${encodeURIComponent(redirect)}`,
    `reject_url=${encodeURIComponent(redirect)}`,
  ].join('&');
  return `${base}/wp-admin/authorize-application.php?${query}`;
}

export interface AuthorizeCredentials {
  siteUrl: string;
  user: string;
  password: string;
}

export type AuthorizeResult =
  | { type: 'success'; creds: AuthorizeCredentials }
  | { type: 'cancel' }
  | { type: 'rejected' };

/** Decode a WP query value (WP encodes spaces as '+'; also handle %-encoding). */
function decodeValue(v: string | undefined): string {
  if (!v) return '';
  try {
    return decodeURIComponent(v.replace(/\+/g, ' '));
  } catch {
    return v.replace(/\+/g, ' ');
  }
}

/** Parse the <scheme>://auth?...{site_url,user_login,password} redirect. */
function parseRedirect(url: string, fallbackSiteUrl: string): AuthorizeResult {
  const qIndex = url.indexOf('?');
  const queryString = qIndex >= 0 ? url.slice(qIndex + 1) : '';
  const raw: Record<string, string> = {};
  for (const pair of queryString.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = eq >= 0 ? pair.slice(0, eq) : pair;
    raw[decodeValue(key)] = eq >= 0 ? pair.slice(eq + 1) : '';
  }

  const password = decodeValue(raw.password);
  const user = decodeValue(raw.user_login);
  // WP appends success=false (and no password) when the user declines.
  if (raw.success === 'false' || !password || !user) {
    return { type: 'rejected' };
  }
  const siteUrl = (decodeValue(raw.site_url) || fallbackSiteUrl).replace(/\/+$/, '');
  return { type: 'success', creds: { siteUrl, user, password } };
}

/**
 * Open the WP authorize screen in a secure auth session and resolve with the
 * parsed Application Password credentials. Returns 'cancel' if the member
 * dismisses the sheet and 'rejected' if they decline authorization.
 */
export async function connectWithAppPassword(
  siteUrl: string
): Promise<AuthorizeResult> {
  const appId = await getAppId();
  const authUrl = buildAuthorizeUrl(siteUrl, appId);
  const redirect = authRedirectUrl();
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirect);
  if (result.type === 'success' && result.url) {
    return parseRedirect(result.url, siteUrl);
  }
  // 'cancel' | 'dismiss' | 'locked' — treat all as a user-initiated cancel.
  return { type: 'cancel' };
}
