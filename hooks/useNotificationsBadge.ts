// hooks/useNotificationsBadge.ts — STUB seam (foundation).
//
// The tab shell reserves the Notifications tabBarBadge slot but does not own the
// unread-count endpoint. The Notifications domain (04) OVERWRITES this hook to
// poll GET /notifications/unread-count. Until then it returns 0 so the shell
// bundles green with no badge.

export function useNotificationsBadge(): number {
  return 0;
}
