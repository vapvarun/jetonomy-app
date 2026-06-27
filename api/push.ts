// api/push.ts — register/unregister this device's Expo push token.
//
// ⚠ Targets plugin 1.6.0 routes POST/DELETE /push/register-device. Until that
// ships, every call NO-OPS GRACEFULLY on 404: it flips pushStore.supported=false,
// logs once, and resolves — never an error toast. Do NOT call /push/subscribe,
// /push/vapid-key, /push/service-worker.js — those are browser web-push (VAPID),
// inapplicable to a native Expo app.

import { client, toApiError } from '@/api/client';
import { usePushStore } from '@/stores/pushStore';
import type {
  DeviceRegistration,
  RegisterDeviceBody,
  UnregisterDeviceBody,
} from '@/types/push';

let warned = false;
function noteUnsupported(): void {
  usePushStore.getState().setSupported(false);
  if (!warned) {
    warned = true;
    // eslint-disable-next-line no-console
    console.info(
      '[push] /push/register-device not available (plugin < 1.6.0); native push disabled.'
    );
  }
}

/**
 * POST /push/register-device. Resolves `null` (no-op) on 404 — the server route
 * is absent until 1.6.0. Other errors throw so callers can surface them.
 */
export async function registerDevice(
  body: RegisterDeviceBody
): Promise<DeviceRegistration | null> {
  try {
    const res = await client.post<DeviceRegistration>(
      '/push/register-device',
      body
    );
    usePushStore.getState().setRegistered(true);
    return res.data;
  } catch (e) {
    const err = toApiError(e);
    if (err.status === 404) {
      noteUnsupported();
      return null;
    }
    throw err;
  }
}

/**
 * DELETE /push/register-device. Same 404 no-op contract as registerDevice.
 */
export async function unregisterDevice(
  body: UnregisterDeviceBody
): Promise<{ deleted: true } | null> {
  try {
    const res = await client.delete<{ deleted: true }>('/push/register-device', {
      data: body,
    });
    usePushStore.getState().setRegistered(false);
    return res.data;
  } catch (e) {
    const err = toApiError(e);
    if (err.status === 404) {
      noteUnsupported();
      return null;
    }
    throw err;
  }
}
