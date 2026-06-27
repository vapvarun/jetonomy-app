// api/whiteLabel.ts — white-label settings get/update (Pro, manage_options).

import { client, toApiError } from '@/api/client';
import type {
  UpdateWhiteLabelBody,
  WhiteLabelSettings,
} from '@/types/whiteLabel';

/** GET /settings/white-label. */
export async function get(): Promise<WhiteLabelSettings> {
  try {
    const res = await client.get<WhiteLabelSettings>('/settings/white-label');
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** PATCH /settings/white-label. */
export async function update(
  body: UpdateWhiteLabelBody
): Promise<WhiteLabelSettings> {
  try {
    const res = await client.patch<WhiteLabelSettings>(
      '/settings/white-label',
      body
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
