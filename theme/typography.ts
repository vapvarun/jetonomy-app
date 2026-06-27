// theme/typography.ts — font scale, weights, line heights.

export const typography = {
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 30,
    '2xl': 36,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  family: {
    // System fonts — white-label builds may override via app config later.
    sans: undefined as string | undefined,
    mono: undefined as string | undefined,
  },
} as const;

export type Typography = typeof typography;
