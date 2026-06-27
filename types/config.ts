// types/config.ts — app-config + site-index shapes (foundation-owned).

/** Pro feature flags surfaced by GET /app/config (all false when free / 404). */
export interface AppFeatures {
  messaging: boolean;
  reactions: boolean;
  polls: boolean;
  badges: boolean;
  custom_fields: boolean;
  web_push: boolean;
  native_push: boolean;
}

/** GET /jetonomy/v1/app/config (plugin 1.6.0; 404 -> DEFAULT_APP_CONFIG). */
export interface AppConfig {
  /** Community name (Settings → General → Community Title); shown in-app. */
  app_name: string | null;
  accent_color: string;
  logo_url: string | null;
  login_bg_url: string | null;
  dark_mode_default: boolean;
  pro_active: boolean;
  features: AppFeatures;
}

/** GET /wp-json/ (WP core root) — white-label + namespace discovery. */
export interface SiteIndex {
  name: string;
  description: string;
  url: string;
  home: string;
  gmt_offset: number;
  site_icon_url?: string;
  namespaces: string[];
  authentication?: Record<string, unknown>;
}
