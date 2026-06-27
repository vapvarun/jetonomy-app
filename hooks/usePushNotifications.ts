// hooks/usePushNotifications.ts — A6 integration: mounts the native-push bridge.
//
// One hook, called once from the root navigator. It:
//   1. installs the foreground notification handler,
//   2. registers this device for Expo push once the user is authenticated
//      (best-effort; no-ops on simulator / pre-1.6.0 server),
//   3. routes a TAPPED notification to its native screen — both for a warm tap
//      (listener) and a cold start (the tap that launched the app).
//
// All navigation goes through routeForNotificationUrl → native expo-router
// paths; the server's web `url` is never opened in a WebView. Everything is
// guarded so the app is fully functional without a push backend.

import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';
import {
  addNotificationResponseListener,
  configureNotificationHandler,
  registerForPushNotifications,
  routeForNotificationUrl,
} from '@/utils/push';

export function usePushNotifications(): void {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  // Foreground display behavior — safe to set once, independent of auth.
  useEffect(() => {
    configureNotificationHandler();
  }, []);

  useEffect(() => {
    if (status !== 'authed') return;

    let cancelled = false;
    const nav = { push: (href: string) => router.push(href as never) };

    // Best-effort device registration (permission + Expo token + server POST).
    void registerForPushNotifications();

    // Cold start: the app was launched by tapping a notification.
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (cancelled || !response) return;
        const data = response.notification.request.content.data as
          | { url?: string }
          | undefined;
        nav.push(routeForNotificationUrl(data?.url));
      })
      .catch(() => {
        // No last response / unsupported — ignore.
      });

    // Warm taps while the app is running/backgrounded.
    const sub = addNotificationResponseListener(nav);

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [status, router]);
}
