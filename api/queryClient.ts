// api/queryClient.ts — shared React Query client + offline cache persister.
//
// gcTime is long so cached feeds/posts aren't garbage-collected; the
// AsyncStorage persister writes the cache to disk so the app opens with the
// last-seen content even offline (until a refetch succeeds). Wired in _layout.

import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Keep cached data ~7 days so it can be restored offline across app restarts. */
export const OFFLINE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: OFFLINE_MAX_AGE,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Persists the query cache to AsyncStorage for offline reads across restarts. */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'jetonomy-rq-cache',
  throttleTime: 1000,
});
