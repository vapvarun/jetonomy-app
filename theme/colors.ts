// theme/colors.ts — token palette built from the site accent color.
// Mirrors the plugin Color Palette tokens (accent_color, text_color, bg_color,
// bg_subtle_color, border_color from jetonomy_settings).

export const DEFAULT_ACCENT = '#3B82F6';

export interface ColorTokens {
  accent: string;
  accentFg: string;
  bg: string;
  bgSubtle: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  danger: string;
  dangerFg: string;
  success: string;
  successFg: string;
  overlay: string;
}

export interface Theme {
  light: ColorTokens;
  dark: ColorTokens;
}

/** Pick a readable foreground (#fff / near-black) for a given hex background. */
export function readableForeground(hex: string): string {
  const c = hex.replace('#', '');
  const full =
    c.length === 3
      ? c
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : c;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  // Perceived luminance (sRGB).
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0F172A' : '#FFFFFF';
}

/**
 * Build the light + dark token sets for a given accent color.
 * Accent comes from appConfig.accent_color; everything else is fixed neutrals.
 */
export function buildTheme(accent: string = DEFAULT_ACCENT): Theme {
  const accentFg = readableForeground(accent);
  return {
    light: {
      accent,
      accentFg,
      bg: '#FFFFFF',
      bgSubtle: '#F8FAFC',
      surface: '#FFFFFF',
      border: '#E2E8F0',
      text: '#0F172A',
      textMuted: '#64748B',
      danger: '#DC2626',
      dangerFg: '#FFFFFF',
      success: '#16A34A',
      successFg: '#FFFFFF',
      overlay: 'rgba(15, 23, 42, 0.45)',
    },
    dark: {
      accent,
      accentFg,
      bg: '#0B1120',
      bgSubtle: '#111827',
      surface: '#1E293B',
      border: '#334155',
      text: '#F1F5F9',
      textMuted: '#94A3B8',
      danger: '#F87171',
      dangerFg: '#0B1120',
      success: '#4ADE80',
      successFg: '#0B1120',
      overlay: 'rgba(0, 0, 0, 0.6)',
    },
  };
}
