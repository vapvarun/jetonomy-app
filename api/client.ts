// api/client.ts — the two shared axios instances every domain imports.
//
// LOCKED CONTRACT (00-MASTER-PLAN §2). Exports:
//   client          baseURL `${siteUrl}/wp-json/jetonomy/v1`
//   coreClient      baseURL `${siteUrl}/wp-json`
//   configureClients({ siteUrl, user?, appPassword? })
//   clearClientAuth()
//   ApiError, toApiError()
//
// Auth = WP core Application Passwords. Every request carries
//   Authorization: Basic base64(user:appPassword)
// No JWT, no nonces — the Basic header makes REST_Auth skip the X-WP-Nonce check.

import axios, { AxiosError, type AxiosInstance } from 'axios';
import { encode as base64Encode } from 'base-64';

/** Normalized error shape mapped from WP_Error / axios. */
export interface ApiError {
  code: string;
  message: string;
  status: number;
  data?: unknown;
}

// Mutable singletons — exported with `let` so configureClients can rebuild them
// on login / logout / site switch while keeping import references stable.
export let client: AxiosInstance = axios.create();
export let coreClient: AxiosInstance = axios.create();

let currentSiteUrl: string | null = null;
let currentAuthHeader: string | null = null;

function buildAuthHeader(user?: string, appPassword?: string): string | null {
  if (!user || !appPassword) return null;
  return 'Basic ' + base64Encode(`${user}:${appPassword}`);
}

function makeInstance(baseURL: string, authHeader: string | null): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: 20000,
    headers: { Accept: 'application/json' },
  });
  // Attach auth per-request so a later configureClients() takes effect even on
  // instances captured by closures.
  instance.interceptors.request.use((config) => {
    if (currentAuthHeader) {
      config.headers.set('Authorization', currentAuthHeader);
    } else {
      config.headers.delete('Authorization');
    }
    return config;
  });
  void authHeader; // header is read live from currentAuthHeader in the interceptor
  return instance;
}

/**
 * (Re)build both axios instances for the given site + credentials.
 * Call on app boot (hydrate), after login, and on site switch.
 */
export function configureClients(opts: {
  siteUrl: string;
  user?: string;
  appPassword?: string;
}): void {
  const siteUrl = opts.siteUrl.replace(/\/+$/, '');
  currentSiteUrl = siteUrl;
  currentAuthHeader = buildAuthHeader(opts.user, opts.appPassword);
  client = makeInstance(`${siteUrl}/wp-json/jetonomy/v1`, currentAuthHeader);
  coreClient = makeInstance(`${siteUrl}/wp-json`, currentAuthHeader);
}

/** Drop the Authorization header (logout) while keeping baseURLs intact. */
export function clearClientAuth(): void {
  currentAuthHeader = null;
  if (currentSiteUrl) {
    client = makeInstance(`${currentSiteUrl}/wp-json/jetonomy/v1`, null);
    coreClient = makeInstance(`${currentSiteUrl}/wp-json`, null);
  }
}

/** The active site URL the clients are pointed at (or null pre-config). */
export function getActiveSiteUrl(): string | null {
  return currentSiteUrl;
}

/**
 * Map any thrown value into the typed ApiError. Reads WP's
 * { code, message, data: { status } } body, falling back to axios/network info.
 * Rate-limit (429 jetonomy_rate_limited) and 401 jetonomy_invalid_credentials
 * surface their `code` verbatim so the UI can branch.
 */
export function toApiError(e: unknown): ApiError {
  if (axios.isAxiosError(e)) {
    const err = e as AxiosError<{ code?: string; message?: string; data?: unknown }>;
    const status = err.response?.status ?? 0;
    const body = err.response?.data;
    if (body && typeof body === 'object') {
      return {
        code: body.code ?? `http_${status || 'error'}`,
        message:
          body.message ?? err.message ?? 'Something went wrong. Please try again.',
        status,
        data: body.data,
      };
    }
    if (!err.response) {
      return {
        code: 'network_error',
        message: 'Network error. Check your connection and try again.',
        status: 0,
      };
    }
    return {
      code: `http_${status}`,
      message: err.message ?? `Request failed (${status}).`,
      status,
    };
  }
  if (e instanceof Error) {
    return { code: 'unknown_error', message: e.message, status: 0 };
  }
  return { code: 'unknown_error', message: 'Unknown error.', status: 0 };
}
