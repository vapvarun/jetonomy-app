// api/digest-admin.ts — admin email-digest tools (Pro, manage_options).
//
// Deliberately separate from api/digest.ts (member prefs) so a member build
// never imports the admin route. Different permission tier.

import { client, toApiError } from '@/api/client';
import type { DigestStats, SendTestDigestBody } from '@/types/digest';

/** POST /admin/digest/test — send a test digest. */
export async function sendTest(
  body: SendTestDigestBody = {}
): Promise<{ sent: boolean; message?: string }> {
  try {
    const res = await client.post<{ sent: boolean; message?: string }>(
      '/admin/digest/test',
      body
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /admin/digest/stats — digest delivery stats. */
export async function getStats(): Promise<DigestStats> {
  try {
    const res = await client.get<DigestStats>('/admin/digest/stats');
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
