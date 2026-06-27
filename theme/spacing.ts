// theme/spacing.ts — 4px base spacing scale + radii + tap-target hit slop.

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/** Minimum 44px tap target — expand small icons/buttons with this. */
export const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

export type Spacing = typeof spacing;
export type Radius = typeof radius;
