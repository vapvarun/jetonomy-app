// types/whiteLabel.ts — white-label settings shape (Pro).

/** GET/PATCH /settings/white-label. */
export interface WhiteLabelSettings {
  brand_name: string;
  logo_url: string | null;
  accent_color: string;
  custom_css: string;
  footer_html: string;
  links: Array<{ label: string; url: string }>;
  [k: string]: unknown;
}

/** Body for PATCH /settings/white-label (all fields optional). */
export type UpdateWhiteLabelBody = Partial<WhiteLabelSettings>;
