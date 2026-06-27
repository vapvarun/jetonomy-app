// api/linkPreview.ts — in-content URL cards + (optional) oEmbed unfurl.

import { client, toApiError } from '@/api/client';
import type { LinkPreview, OEmbed } from '@/types/linkPreview';

/** GET /link-preview — 400 on invalid / SSRF-blocked URL. */
export async function getLinkPreview(url: string): Promise<LinkPreview> {
  try {
    const res = await client.get<LinkPreview>('/link-preview', { params: { url } });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/**
 * GET /oembed — for unfurling Jetonomy thread URLs specifically. Low priority
 * in-app (threads render natively); included for completeness.
 */
export async function getOEmbed(
  url: string,
  opts?: { type?: 'rich' | 'link'; maxwidth?: number; maxheight?: number }
): Promise<OEmbed> {
  try {
    const res = await client.get<OEmbed>('/oembed', { params: { url, ...opts } });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
