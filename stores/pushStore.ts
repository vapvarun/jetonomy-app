// stores/pushStore.ts — native push runtime state (A5).
//
// `supported` flips to false the first time /push/register-device 404s (route
// ships in plugin 1.6.0). The rest of the app is fully functional without push.

import { create } from 'zustand';

export type PushPermission = 'undetermined' | 'granted' | 'denied';

interface PushState {
  /** False once the server route is known-absent (404). Defaults true (optimistic). */
  supported: boolean;
  permission: PushPermission;
  token: string | null;
  registered: boolean;

  setSupported: (v: boolean) => void;
  setPermission: (p: PushPermission) => void;
  setToken: (t: string | null) => void;
  setRegistered: (v: boolean) => void;
  reset: () => void;
}

export const usePushStore = create<PushState>((set) => ({
  supported: true,
  permission: 'undetermined',
  token: null,
  registered: false,

  setSupported: (v) => set({ supported: v }),
  setPermission: (p) => set({ permission: p }),
  setToken: (t) => set({ token: t }),
  setRegistered: (v) => set({ registered: v }),
  reset: () =>
    set({ permission: 'undetermined', token: null, registered: false }),
}));

/** Non-hook accessor for modules outside React (api/push.ts, utils/push.ts). */
export const pushStore = usePushStore;
