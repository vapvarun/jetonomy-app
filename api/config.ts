// api/config.ts — app config (feature gating) + site index, both fallback-safe.

import { client, coreClient } from '@/api/client';
import type { AppConfig, AppFeatures, SiteIndex } from '@/types/config';
import { DEFAULT_ACCENT } from '@/theme/colors';

/** All Pro features OFF — the safe baseline for free sites / 404 / parse failure. */
export const DEFAULT_FEATURES: AppFeatures = {
  messaging: false,
  reactions: false,
  polls: false,
  badges: false,
  custom_fields: false,
  web_push: false,
  native_push: false,
};

export const DEFAULT_APP_CONFIG: AppConfig = {
  accent_color: DEFAULT_ACCENT,
  logo_url: null,
  login_bg_url: null,
  dark_mode_default: false,
  pro_active: false,
  features: { ...DEFAULT_FEATURES },
};

/**
 * GET /app/config (plugin 1.6.0). On 404 / network / parse failure return
 * DEFAULT_APP_CONFIG so a 1.4.x site degrades to "free, all-Pro-off".
 * Never throws.
 */
export async function getAppConfig(): Promise<AppConfig> {
  try {
    const res = await client.get<Partial<AppConfig>>('/app/config');
    const data = res.data ?? {};
    return {
      accent_color: data.accent_color || DEFAULT_APP_CONFIG.accent_color,
      logo_url: data.logo_url ?? null,
      login_bg_url: data.login_bg_url ?? null,
      dark_mode_default: data.dark_mode_default ?? false,
      pro_active: data.pro_active ?? false,
      features: { ...DEFAULT_FEATURES, ...(data.features ?? {}) },
    };
  } catch {
    return { ...DEFAULT_APP_CONFIG, features: { ...DEFAULT_FEATURES } };
  }
}

/**
 * GET /wp-json/ (WP core root). Site name/description/icon + gmt_offset +
 * namespace list. Returns null on failure (caller falls back to defaults).
 */
export async function getSiteIndex(): Promise<SiteIndex | null> {
  try {
    const res = await coreClient.get<SiteIndex>('');
    const d = res.data;
    if (!d) return null;
    return {
      name: d.name ?? '',
      description: d.description ?? '',
      url: d.url ?? '',
      home: d.home ?? '',
      gmt_offset: typeof d.gmt_offset === 'number' ? d.gmt_offset : 0,
      site_icon_url: d.site_icon_url,
      namespaces: Array.isArray(d.namespaces) ? d.namespaces : [],
      authentication: d.authentication,
    };
  } catch {
    return null;
  }
}
