// api/auth.ts — auth + account credential functions.
//
// Auth model: WP core Application Passwords. login() validates an App Password
// against core wp/v2/users/me?context=edit (which 401s on bad creds), NOT the
// public jetonomy /users/me route (permission __return_true — never rejects).

import { client, coreClient, configureClients, clearClientAuth, toApiError } from '@/api/client';
import type { ApiError } from '@/api/client';
import type { AuthMessageResponse, RegisterInput } from '@/types/auth';
import type { Me } from '@/types/user';

/**
 * Validate an Application Password for a site, then hydrate the Jetonomy profile.
 * Throws ApiError on bad creds (401) so the UI can show a credential error.
 */
export async function login(
  siteUrl: string,
  user: string,
  appPassword: string
): Promise<Me> {
  configureClients({ siteUrl, user, appPassword });
  try {
    // 200 = valid App Password; 401 = bad creds (WP core).
    await coreClient.get('/wp/v2/users/me', { params: { context: 'edit' } });
  } catch (e) {
    const err = toApiError(e);
    // WP returns 401 (rest_not_logged_in / incorrect creds) for a wrong username
    // or an invalid Application Password — surface a clear, actionable message
    // instead of WP's "You are not currently logged in." / a generic fallback.
    if (err.status === 401) {
      throw { ...err, message: 'Wrong username or application password.' } as ApiError;
    }
    throw err;
  }
  // Creds are good — hydrate the Jetonomy `Me` shape.
  return getMe();
}

/** GET /users/me — resolves the current member via the Basic header. */
export async function getMe(): Promise<Me> {
  try {
    const res = await client.get<Me>('/users/me');
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** PATCH /users/me — partial profile update; returns the updated Me. */
export async function updateMe(patch: Partial<Me>): Promise<Me> {
  try {
    const res = await client.patch<Me>('/users/me', patch);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /auth/register — creates the WP account (honeypot + timing sent). */
export async function register(params: RegisterInput): Promise<AuthMessageResponse> {
  try {
    const res = await client.post<AuthMessageResponse>('/auth/register', {
      website: '',
      ...params,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /auth/lost-password — generic success (enumeration-proof). */
export async function lostPassword(
  user_login: string,
  captcha_token?: string
): Promise<AuthMessageResponse> {
  try {
    const res = await client.post<AuthMessageResponse>('/auth/lost-password', {
      user_login,
      captcha_token,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /auth/resend-verification — generic success. */
export async function resendVerification(
  user_login: string
): Promise<AuthMessageResponse> {
  try {
    const res = await client.post<AuthMessageResponse>('/auth/resend-verification', {
      user_login,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/**
 * Local logout only — App Passwords are revoked server-side from wp-admin.
 * Drops the auth header; the caller (authStore) wipes secure store + state.
 */
export function logout(): void {
  clearClientAuth();
}
