// api/digest.ts — member email-digest preferences.
//
// Maps to GET/PATCH /users/me/digest-preferences (Email_Digest controller; perm
// is_user_logged_in / read). The route ships with plugin 1.6.0 (Email_Digest
// extension) — on a 1.5.x site it 404s, so settings.tsx gates the digest row on
// DIGEST_ENDPOINT_AVAILABLE. Flip that flag to true once the deployed site is on
// 1.6.0+. Types live in types/digest.ts (shared with api/digest-admin.ts).

import { client, toApiError } from '@/api/client';
import type {
  DigestPreferences,
  UpdateDigestBody,
} from '@/types/digest';

export type { DigestPreferences } from '@/types/digest';

/**
 * Gate flag — the digest endpoint is part of the Pro Email_Digest extension and
 * is absent on older sites. Settings hides the digest UI while this is false.
 */
export const DIGEST_ENDPOINT_AVAILABLE = true;

/** GET /users/me/digest-preferences. */
export async function getDigestPreferences(): Promise<DigestPreferences> {
  try {
    const res = await client.get<DigestPreferences>('/users/me/digest-preferences');
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** PATCH /users/me/digest-preferences. */
export async function updateDigestPreferences(
  body: UpdateDigestBody
): Promise<DigestPreferences> {
  try {
    const res = await client.patch<DigestPreferences>(
      '/users/me/digest-preferences',
      body
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
