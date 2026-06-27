// api/badges.ts — custom badges [PRO]. Registers on jetonomy/v1 (foundation client).
// Catalog + per-user earned badges are member-facing; award/CRUD are admin seams.

import { client, toApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type { Badge, UserBadge } from '@/types/badge';

export interface ListBadgesQuery {
  page?: number;
  per_page?: number;
}

/** GET /badges — paged catalog. */
export async function listBadges(
  q: ListBadgesQuery = {}
): Promise<ListEnvelope<Badge>> {
  try {
    const res = await client.get<ListEnvelope<Badge>>('/badges', { params: q });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /badges/{id} — single badge. */
export async function getBadge(id: number): Promise<Badge> {
  try {
    const res = await client.get<Badge>(`/badges/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /users/{id}/badges — badges this user earned (+ earned_at, metadata). */
export async function getUserBadges(id: number): Promise<{ data: UserBadge[] }> {
  try {
    const res = await client.get<{ data: UserBadge[] }>(`/users/${id}/badges`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

// ---- Admin seams (manage_options). NOT wired to member UI. ----

export async function awardBadge(
  badgeId: number,
  userId: number
): Promise<UserBadge> {
  try {
    const res = await client.post<UserBadge>(`/badges/${badgeId}/award`, {
      user_id: userId,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function createBadge(body: Partial<Badge>): Promise<Badge> {
  try {
    const res = await client.post<Badge>('/badges', body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function updateBadge(
  id: number,
  body: Partial<Badge>
): Promise<Badge> {
  try {
    const res = await client.patch<Badge>(`/badges/${id}`, body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function deleteBadge(id: number): Promise<{ deleted: true }> {
  try {
    const res = await client.delete<{ deleted: true }>(`/badges/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
