// stores/settingsStore.ts — non-secret UI preferences (persisted in AsyncStorage).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type ColorSchemePref = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'jetonomy.settings.colorScheme';

interface SettingsState {
  colorScheme: ColorSchemePref;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setColorScheme: (scheme: ColorSchemePref) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  colorScheme: 'system',
  hydrated: false,

  hydrate: async () => {
    try {
      const stored = (await AsyncStorage.getItem(STORAGE_KEY)) as ColorSchemePref | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        set({ colorScheme: stored, hydrated: true });
        return;
      }
    } catch {
      // ignore — fall back to default
    }
    set({ hydrated: true });
  },

  setColorScheme: (scheme) => {
    set({ colorScheme: scheme });
    void AsyncStorage.setItem(STORAGE_KEY, scheme);
  },
}));

/**
 * Resolve the effective 'light' | 'dark' scheme from the user preference, the
 * device scheme, and the site's dark_mode_default (used when pref is 'system').
 */
export function resolveColorScheme(
  pref: ColorSchemePref,
  deviceScheme: 'light' | 'dark' | null | undefined,
  darkModeDefault: boolean
): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref;
  if (deviceScheme === 'light' || deviceScheme === 'dark') return deviceScheme;
  return darkModeDefault ? 'dark' : 'light';
}
