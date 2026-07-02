// types/push.ts — native (Expo) push registration shapes.
//
// Targets the plugin 1.6.0 endpoints POST/DELETE /push/register-device. Until
// the route ships, api/push.ts no-ops gracefully on 404. These are Expo push
// tokens (APNs/FCM under the hood) — NOT W3C web-push subscriptions.

export type PushPlatform = 'ios' | 'android';

/** Body for POST /push/register-device. Field names match the 1.6.0 plugin
 *  contract: rest_register_device reads expo_push_token / platform / device_name. */
export interface RegisterDeviceBody {
  expo_push_token: string;
  platform: PushPlatform;
  device_name: string;
}

/** Body for DELETE /push/register-device (plugin reads expo_push_token). */
export interface UnregisterDeviceBody {
  expo_push_token: string;
}

/** Server acknowledgement of a stored Expo token. */
export interface DeviceRegistration {
  id: number;
  token: string;
  platform: PushPlatform;
  device_id: string;
  created_at?: string | null;
}
