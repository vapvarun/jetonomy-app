// api/seo.ts — per-space SEO editor (Pro seo-pro, space-scoped; 403 = not your space).

import { client, toApiError } from '@/api/client';
import type { SpaceSeo, UpdateSpaceSeoBody } from '@/types/seo';

/** GET /spaces/{id}/seo. */
export async function getSpaceSeo(spaceId: number): Promise<SpaceSeo> {
  try {
    const res = await client.get<SpaceSeo>(`/spaces/${spaceId}/seo`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** PATCH /spaces/{id}/seo. */
export async function updateSpaceSeo(
  spaceId: number,
  body: UpdateSpaceSeoBody
): Promise<SpaceSeo> {
  try {
    const res = await client.patch<SpaceSeo>(`/spaces/${spaceId}/seo`, body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
