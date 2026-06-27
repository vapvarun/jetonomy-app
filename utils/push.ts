// utils/push.ts — expo-notifications integration for native push.
//
// Responsibilities:
//   1. Configure the foreground notification handler + Android channel.
//   2. Request OS permission and acquire the Expo push token.
//   3. Hand the token to api/push.ts (which no-ops on a pre-1.6.0 server).
//   4. Map a tapped notification's payload `{ url }` to an expo-router route
//      (native navigation — never a WebView).
//
// All functions are safe to call when pushStore.supported === false; they early
// out so the app works fully without a push backend.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { registerDevice, unregisterDevice } from '@/api/push';
import { usePushStore, type PushPermission } from '@/stores/pushStore';
import type { PushPlatform } from '@/types/push';

const DEVICE_ID_KEY = 'jetonomy.push.device_id';

/** Stable per-install device id (random, persisted). */
async function getDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return `${Date.now().toString(36)}-ephemeral`;
  }
}

function currentPlatform(): PushPlatform {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

/** Configure how notifications display while the app is foregrounded. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () =>
      ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }) as Notifications.NotificationBehavior,
  });
}

/** Android requires an explicit channel for heads-up notifications. */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch {
    // Channel setup is best-effort.
  }
}

function projectId(): string | undefined {
  const extra =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined) ??
    undefined;
  const id =
    extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig
      ?.projectId;
  // The scaffolded app.json ships a "REPLACE_VIA_eas_init" placeholder until the
  // owner runs `eas init`. Treat any placeholder as "no projectId" so
  // getExpoPushTokenAsync isn't called with a value that can't mint a token.
  if (!id || id.startsWith('REPLACE')) return undefined;
  return id;
}

/**
 * Request permission, acquire the Expo token, and register the device. Returns
 * the token or null. Updates pushStore at every step. Never throws.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const store = usePushStore.getState();
  try {
    configureNotificationHandler();
    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status as PushPermission;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status as PushPermission;
    }
    store.setPermission(status);
    if (status !== 'granted') return null;

    let token: string | null = null;
    try {
      const pid = projectId();
      const res = await Notifications.getExpoPushTokenAsync(
        pid ? { projectId: pid } : undefined
      );
      token = res.data;
    } catch {
      // No projectId in dev / simulator without a dev build — token unavailable.
      token = null;
    }
    store.setToken(token);
    if (!token) return null;

    const device_id = await getDeviceId();
    // No-ops gracefully on a pre-1.6.0 server (api/push flips supported=false).
    await registerDevice({ token, platform: currentPlatform(), device_id });
    return token;
  } catch {
    return null;
  }
}

/** Unregister the current token (e.g. on sign-out). Never throws. */
export async function unregisterForPushNotifications(): Promise<void> {
  const token = usePushStore.getState().token;
  if (!token) return;
  try {
    await unregisterDevice({ token });
  } catch {
    // best-effort
  }
}

/**
 * Map a server notification URL to an expo-router path. The server emits web
 * URLs (base_url()+'/notifications/', post/space permalinks). We extract the
 * salient id/slug and route to the matching NATIVE screen, falling back to the
 * notifications tab.
 */
export function routeForNotificationUrl(url: string | undefined | null): string {
  if (!url) return '/notifications';
  let path = url;
  try {
    // Strip scheme + host if present.
    const m = url.match(/^[a-z]+:\/\/[^/]+(\/.*)$/i);
    if (m) path = m[1];
  } catch {
    path = url;
  }

  // ?p=123 style permalink.
  const pid = path.match(/[?&]p=(\d+)/);
  if (pid) return `/post/${pid[1]}`;

  // /post/{id} or /t/{id} (topic) → native post detail.
  const post = path.match(/\/(?:post|t|topic|posts)\/(\d+)/i);
  if (post) return `/post/${post[1]}`;

  // /space/{idOrSlug} | /spaces/{...} | /s/{...} → native space screen.
  const space = path.match(/\/(?:space|spaces|s)\/([^/?#]+)/i);
  if (space) return `/space/${space[1]}`;

  if (/\/notifications/i.test(path)) return '/notifications';
  return '/notifications';
}

/**
 * Wire the tap handler: when the user taps a notification, deep-link into the
 * app. Returns the subscription so the caller can remove it on unmount.
 */
export function addNotificationResponseListener(
  router: { push: (href: string) => void }
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as
      | { url?: string }
      | undefined;
    const route = routeForNotificationUrl(data?.url);
    try {
      router.push(route);
    } catch {
      router.push('/notifications');
    }
  });
}
