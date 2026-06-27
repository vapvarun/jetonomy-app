// stores/authStore.ts — multi-tenant auth state (00-MASTER-PLAN §0 addendum).
//
// Holds MANY saved site sessions, one active. configureClients() always points
// at the active session. v1 UI may surface a single active site with add/switch,
// but the store never assumes a single global credential.

import { create } from 'zustand';

import { configureClients, clearClientAuth } from '@/api/client';
import { getAppConfig, getSiteIndex, DEFAULT_APP_CONFIG } from '@/api/config';
import { getMe } from '@/api/auth';
import {
  loadCreds,
  loadSitesIndex,
  saveCreds,
  clearCreds,
  setActiveSite,
} from '@/utils/secureStore';
import type { Credentials } from '@/types/auth';
import type { AppConfig, AppFeatures, SiteIndex } from '@/types/config';
import type { Me } from '@/types/user';

/** One per-site session. App-password secret lives in SecureStore, keyed by siteUrl. */
export interface Session {
  siteUrl: string;
  user: Me | null;
  creds: Credentials | null;
  appConfig: AppConfig;
  siteIndex: SiteIndex | null;
}

export type AuthStatus = 'unknown' | 'unauthed' | 'authed';

interface AuthState {
  sites: Record<string, Session>;
  activeSiteUrl: string | null;
  status: AuthStatus;

  // lifecycle
  hydrate: () => Promise<void>;
  signIn: (siteUrl: string, user: string, appPassword: string, me?: Me) => Promise<void>;
  signOut: () => Promise<void>;
  switchSite: (siteUrl: string) => Promise<void>;

  // setters (used by api hooks after refetch)
  setUser: (user: Me) => void;
  setAppConfig: (config: AppConfig) => void;
  refreshActiveConfig: () => Promise<void>;
}

function emptySession(siteUrl: string): Session {
  return {
    siteUrl,
    user: null,
    creds: null,
    appConfig: { ...DEFAULT_APP_CONFIG },
    siteIndex: null,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  sites: {},
  activeSiteUrl: null,
  status: 'unknown',

  hydrate: async () => {
    try {
      const index = await loadSitesIndex();
      const active = index.activeSiteUrl;
      if (!active) {
        set({ status: 'unauthed' });
        return;
      }
      const loaded = await loadCreds(active);
      if (!loaded) {
        set({ status: 'unauthed' });
        return;
      }
      configureClients({
        siteUrl: loaded.siteUrl,
        user: loaded.creds.user,
        appPassword: loaded.creds.appPassword,
      });
      const session = emptySession(loaded.siteUrl);
      session.creds = loaded.creds;
      // Re-fetch profile + config (in-memory, not persisted).
      const [me, appConfig, siteIndex] = await Promise.all([
        getMe().catch(() => null),
        getAppConfig(),
        getSiteIndex(),
      ]);
      session.user = me;
      session.appConfig = appConfig;
      session.siteIndex = siteIndex;
      set({
        sites: { ...get().sites, [loaded.siteUrl]: session },
        activeSiteUrl: loaded.siteUrl,
        status: me ? 'authed' : 'unauthed',
      });
    } catch {
      // Hydrate failure → treat as unauthed (login screen).
      set({ status: 'unauthed' });
    }
  },

  signIn: async (siteUrl, user, appPassword, me) => {
    configureClients({ siteUrl, user, appPassword });
    await saveCreds(siteUrl, user, appPassword);
    const session = emptySession(siteUrl);
    session.creds = { user, appPassword };
    session.user = me ?? (await getMe().catch(() => null));
    const [appConfig, siteIndex] = await Promise.all([
      getAppConfig(),
      getSiteIndex(),
    ]);
    session.appConfig = appConfig;
    session.siteIndex = siteIndex;
    set({
      sites: { ...get().sites, [siteUrl]: session },
      activeSiteUrl: siteUrl,
      status: 'authed',
    });
  },

  signOut: async () => {
    const active = get().activeSiteUrl;
    clearClientAuth();
    if (active) await clearCreds(active);
    const index = await loadSitesIndex();
    const sites = { ...get().sites };
    if (active) delete sites[active];
    const nextActive = index.activeSiteUrl;
    if (nextActive) {
      // Another saved site exists — switch to it.
      await get().switchSite(nextActive);
      return;
    }
    set({ sites, activeSiteUrl: null, status: 'unauthed' });
  },

  switchSite: async (siteUrl) => {
    const loaded = await loadCreds(siteUrl);
    if (!loaded) return;
    await setActiveSite(siteUrl);
    configureClients({
      siteUrl,
      user: loaded.creds.user,
      appPassword: loaded.creds.appPassword,
    });
    let session = get().sites[siteUrl] ?? emptySession(siteUrl);
    session = { ...session, creds: loaded.creds };
    const [me, appConfig, siteIndex] = await Promise.all([
      getMe().catch(() => session.user),
      getAppConfig(),
      getSiteIndex(),
    ]);
    session = { ...session, user: me, appConfig, siteIndex };
    set({
      sites: { ...get().sites, [siteUrl]: session },
      activeSiteUrl: siteUrl,
      status: me ? 'authed' : 'unauthed',
    });
  },

  setUser: (user) => {
    const active = get().activeSiteUrl;
    if (!active) return;
    const session = get().sites[active];
    if (!session) return;
    set({ sites: { ...get().sites, [active]: { ...session, user } } });
  },

  setAppConfig: (config) => {
    const active = get().activeSiteUrl;
    if (!active) return;
    const session = get().sites[active];
    if (!session) return;
    set({ sites: { ...get().sites, [active]: { ...session, appConfig: config } } });
  },

  refreshActiveConfig: async () => {
    const active = get().activeSiteUrl;
    if (!active) return;
    const config = await getAppConfig();
    get().setAppConfig(config);
  },
}));

// ---- Selector helpers (the locked feature-gating contract) ----

/** The active session, or null. */
export function useActiveSession(): Session | null {
  return useAuthStore((s) => (s.activeSiteUrl ? s.sites[s.activeSiteUrl] ?? null : null));
}

export function useIsAuthed(): boolean {
  return useAuthStore((s) => s.status === 'authed');
}

export function useCurrentUser(): Me | null {
  return useAuthStore((s) =>
    s.activeSiteUrl ? s.sites[s.activeSiteUrl]?.user ?? null : null
  );
}

export function useActiveSiteUrl(): string | null {
  return useAuthStore((s) => s.activeSiteUrl);
}

export function useAppConfig(): AppConfig {
  return useAuthStore((s) =>
    s.activeSiteUrl
      ? s.sites[s.activeSiteUrl]?.appConfig ?? DEFAULT_APP_CONFIG
      : DEFAULT_APP_CONFIG
  );
}

/** LOCKED CONTRACT: Pro UI gates on these flags; free is always on. */
export function useFeatures(): AppFeatures {
  return useAuthStore((s) =>
    s.activeSiteUrl
      ? s.sites[s.activeSiteUrl]?.appConfig.features ?? DEFAULT_APP_CONFIG.features
      : DEFAULT_APP_CONFIG.features
  );
}
