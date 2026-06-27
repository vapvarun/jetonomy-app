// utils/secureStore.ts — typed wrappers over expo-secure-store.
// Multi-tenant: credentials are keyed per siteUrl so a user can hold sessions
// for several Jetonomy communities at once. Never logs secret values.

import * as SecureStore from 'expo-secure-store';

import type { Credentials } from '@/types/auth';

/** Index of known site URLs + which one is active (non-secret-ish, still in SecureStore). */
const INDEX_KEY = 'jetonomy.sites.index';
/** Per-site credential record prefix. */
const CREDS_PREFIX = 'jetonomy.creds.';

export interface StoredSitesIndex {
  siteUrls: string[];
  activeSiteUrl: string | null;
}

/** SecureStore keys must be alphanumeric + ".-_" — hash arbitrary URLs into that space. */
function credKey(siteUrl: string): string {
  // Deterministic, collision-resistant-enough slug of the URL.
  let hash = 0;
  for (let i = 0; i < siteUrl.length; i++) {
    hash = (hash << 5) - hash + siteUrl.charCodeAt(i);
    hash |= 0;
  }
  return `${CREDS_PREFIX}${Math.abs(hash).toString(36)}`;
}

export async function loadSitesIndex(): Promise<StoredSitesIndex> {
  const raw = await SecureStore.getItemAsync(INDEX_KEY);
  if (!raw) return { siteUrls: [], activeSiteUrl: null };
  try {
    const parsed = JSON.parse(raw) as StoredSitesIndex;
    return {
      siteUrls: Array.isArray(parsed.siteUrls) ? parsed.siteUrls : [],
      activeSiteUrl: parsed.activeSiteUrl ?? null,
    };
  } catch {
    return { siteUrls: [], activeSiteUrl: null };
  }
}

async function saveSitesIndex(index: StoredSitesIndex): Promise<void> {
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(index));
}

/** Persist creds for a site and mark it active. */
export async function saveCreds(
  siteUrl: string,
  user: string,
  appPassword: string
): Promise<void> {
  const payload: Credentials = { user, appPassword };
  await SecureStore.setItemAsync(credKey(siteUrl), JSON.stringify(payload));
  const index = await loadSitesIndex();
  const siteUrls = index.siteUrls.includes(siteUrl)
    ? index.siteUrls
    : [...index.siteUrls, siteUrl];
  await saveSitesIndex({ siteUrls, activeSiteUrl: siteUrl });
}

/** Read creds for a specific site (defaults to the active site). */
export async function loadCreds(
  siteUrl?: string
): Promise<{ siteUrl: string; creds: Credentials } | null> {
  const index = await loadSitesIndex();
  const target = siteUrl ?? index.activeSiteUrl;
  if (!target) return null;
  const raw = await SecureStore.getItemAsync(credKey(target));
  if (!raw) return null;
  try {
    const creds = JSON.parse(raw) as Credentials;
    if (!creds.user || !creds.appPassword) return null;
    return { siteUrl: target, creds };
  } catch {
    return null;
  }
}

/** Switch the active site without touching stored secrets. */
export async function setActiveSite(siteUrl: string): Promise<void> {
  const index = await loadSitesIndex();
  if (!index.siteUrls.includes(siteUrl)) return;
  await saveSitesIndex({ ...index, activeSiteUrl: siteUrl });
}

/** Remove one site's creds (and re-point active if it was the active one). */
export async function clearCreds(siteUrl?: string): Promise<void> {
  const index = await loadSitesIndex();
  const target = siteUrl ?? index.activeSiteUrl;
  if (!target) return;
  await SecureStore.deleteItemAsync(credKey(target));
  const siteUrls = index.siteUrls.filter((u) => u !== target);
  const activeSiteUrl =
    index.activeSiteUrl === target ? (siteUrls[0] ?? null) : index.activeSiteUrl;
  await saveSitesIndex({ siteUrls, activeSiteUrl });
}
