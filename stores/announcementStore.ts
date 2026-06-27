// stores/announcementStore.ts — per-id dismissal of site-announcement banners.
//
// Dismissals persist via AsyncStorage so a banner stays dismissed across app
// launches. Keyed by announcement id (a pinned-post id).

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'jetonomy.announcements.dismissed';

interface AnnouncementState {
  dismissed: Record<number, true>;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  dismiss: (id: number) => void;
  isDismissed: (id: number) => boolean;
}

export const useAnnouncementStore = create<AnnouncementState>((set, get) => ({
  dismissed: {},
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const ids: number[] = raw ? JSON.parse(raw) : [];
      const dismissed: Record<number, true> = {};
      for (const id of ids) dismissed[id] = true;
      set({ dismissed, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  dismiss: (id) => {
    const next = { ...get().dismissed, [id]: true as const };
    set({ dismissed: next });
    void AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Object.keys(next).map(Number))
    );
  },

  isDismissed: (id) => Boolean(get().dismissed[id]),
}));
