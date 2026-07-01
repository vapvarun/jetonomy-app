// hooks/useNotificationsBadge.ts — tab-badge unread count (Notifications domain 04).
//
// Foundation reserved this hook as a stub returning 0; the Notifications domain
// OVERWRITES it to poll GET /notifications/unread-count via React Query. The tab
// shell (app/(tabs)/_layout.tsx) reads it for the Bell tabBarBadge. Delegates to
// useUnreadCount (keyed ['notifications','unread-count']) so there is one poll.

import { useUnreadCount } from '@/hooks/useNotifications';

export function useNotificationsBadge(): number {
  const { data } = useUnreadCount();
  return data ?? 0;
}
