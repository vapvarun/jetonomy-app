// theme/ThemeContext.tsx — resolves the active theme from app config + scheme
// preference and exposes it via useTheme(). Foundation-owned.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { buildTheme, type ColorTokens } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useAppConfig } from '@/stores/authStore';
import { resolveColorScheme, useSettingsStore } from '@/stores/settingsStore';

export interface ActiveTheme {
  scheme: 'light' | 'dark';
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

const ThemeContext = createContext<ActiveTheme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const appConfig = useAppConfig();
  const pref = useSettingsStore((s) => s.colorScheme);
  const deviceScheme = useColorScheme();

  const value = useMemo<ActiveTheme>(() => {
    const scheme = resolveColorScheme(
      pref,
      deviceScheme,
      appConfig.dark_mode_default
    );
    const theme = buildTheme(appConfig.accent_color);
    return {
      scheme,
      colors: theme[scheme],
      spacing,
      radius,
      typography,
    };
  }, [pref, deviceScheme, appConfig.accent_color, appConfig.dark_mode_default]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ActiveTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so a stray consumer outside the provider still renders.
    return {
      scheme: 'light',
      colors: buildTheme().light,
      spacing,
      radius,
      typography,
    };
  }
  return ctx;
}
