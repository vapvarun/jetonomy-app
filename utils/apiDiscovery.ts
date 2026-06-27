// utils/apiDiscovery.ts — validate a candidate site is a reachable Jetonomy site
// BEFORE we ask for credentials or configure the shared clients. Multi-tenant:
// works for any user-entered URL over the public internet.

import axios from 'axios';

import type { SiteIndex } from '@/types/config';

const JETONOMY_NAMESPACE = 'jetonomy/v1';

export interface SiteValidation {
  ok: boolean;
  hasJetonomy: boolean;
  siteName: string | null;
  siteIcon: string | null;
  siteUrl: string; // normalized
  /** Machine-readable failure reason for the UI to branch on. */
  reason?:
    | 'insecure'
    | 'unreachable'
    | 'not_jetonomy'
    | 'auth_blocked'
    | 'bad_url';
  message?: string;
}

/** A host that is allowed to use http:// (Local-by-Flywheel dev, loopback). */
export function isLocalHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === 'localhost' ||
    h.endsWith('.local') ||
    h.endsWith('.test') ||
    h === '127.0.0.1' ||
    h.startsWith('10.') ||
    h.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)
  );
}

/** Normalize user input into a clean origin (scheme + host, no trailing slash/path). */
export function normalizeSiteUrl(input: string): {
  url: string;
  host: string;
} | null {
  let raw = input.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    const u = new URL(raw);
    const url = `${u.protocol}//${u.host}`;
    return { url, host: u.hostname };
  } catch {
    return null;
  }
}

/**
 * Validate the URL is a Jetonomy site.
 * 1. Normalize + enforce HTTPS (unless local dev host).
 * 2. GET /wp-json/ (core root) and assert namespaces includes jetonomy/v1.
 * 3. Fallback: probe /wp-json/jetonomy/v1 directly (route index 200).
 */
export async function verifyJetonomySite(input: string): Promise<SiteValidation> {
  const normalized = normalizeSiteUrl(input);
  if (!normalized) {
    return {
      ok: false,
      hasJetonomy: false,
      siteName: null,
      siteIcon: null,
      siteUrl: input,
      reason: 'bad_url',
      message: 'Enter a valid site address.',
    };
  }

  const { url, host } = normalized;
  const isLocal = isLocalHost(host);
  if (url.startsWith('http://') && !isLocal) {
    return {
      ok: false,
      hasJetonomy: false,
      siteName: null,
      siteIcon: null,
      siteUrl: url,
      reason: 'insecure',
      message: 'This site must use https:// to connect securely.',
    };
  }

  const http = axios.create({ timeout: 12000 });

  // Step 1 — core root for site index + namespace list.
  try {
    const res = await http.get<SiteIndex>(`${url}/wp-json/`);
    const data = res.data;
    const namespaces = Array.isArray(data?.namespaces) ? data.namespaces : [];
    const hasJetonomy = namespaces.includes(JETONOMY_NAMESPACE);
    if (hasJetonomy) {
      return {
        ok: true,
        hasJetonomy: true,
        siteName: data?.name ?? null,
        siteIcon: data?.site_icon_url ?? null,
        siteUrl: url,
      };
    }
  } catch {
    // fall through to direct route probe
  }

  // Step 2 — direct namespace probe.
  try {
    const probe = await http.get(`${url}/wp-json/${JETONOMY_NAMESPACE}`, {
      validateStatus: (s) => s < 500,
    });
    if (probe.status === 200) {
      return {
        ok: true,
        hasJetonomy: true,
        siteName: null,
        siteIcon: null,
        siteUrl: url,
      };
    }
    return {
      ok: false,
      hasJetonomy: false,
      siteName: null,
      siteIcon: null,
      siteUrl: url,
      reason: 'not_jetonomy',
      message: "This site isn't running Jetonomy.",
    };
  } catch {
    return {
      ok: false,
      hasJetonomy: false,
      siteName: null,
      siteIcon: null,
      siteUrl: url,
      reason: 'unreachable',
      message: "Couldn't reach this site. Check the address and your connection.",
    };
  }
}

/** Addendum alias — same behavior, name used by the multi-tenant login flow. */
export const validateJetonomy = verifyJetonomySite;
