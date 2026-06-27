// api/moderation.ts — global + per-space moderation management (admin).
//
// Member flag *creation* lives in api/flags.ts. Everything here is admin /
// space-moderator and gated by the server 403 (06 spec). All lists paginate.

import { client, toApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type {
  BanBody,
  BulkActionBody,
  Flag,
  ModeratedType,
  ModerationAction,
  QueueItem,
  ResolveFlagBody,
} from '@/types/moderation';

export interface QueueQuery {
  status?: string;
  type?: ModeratedType | 'all';
  page?: number;
  per_page?: number;
}

/** GET /moderation/queue — pending objects awaiting moderation. */
export async function getQueue(
  q: QueueQuery = {}
): Promise<ListEnvelope<QueueItem>> {
  try {
    const res = await client.get<ListEnvelope<QueueItem>>('/moderation/queue', {
      params: {
        status: q.status,
        type: q.type && q.type !== 'all' ? q.type : undefined,
        page: q.page,
        per_page: q.per_page,
      },
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /moderation/approve/{type}/{id}. */
export async function approve(
  type: ModeratedType,
  id: number
): Promise<{ ok: true }> {
  try {
    const res = await client.post<{ ok: true }>(`/moderation/approve/${type}/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /moderation/spam/{type}/{id}. */
export async function markSpam(
  type: ModeratedType,
  id: number
): Promise<{ ok: true }> {
  try {
    const res = await client.post<{ ok: true }>(`/moderation/spam/${type}/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /moderation/trash/{type}/{id}. */
export async function trash(
  type: ModeratedType,
  id: number
): Promise<{ ok: true }> {
  try {
    const res = await client.post<{ ok: true }>(`/moderation/trash/${type}/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /moderation/bulk — approve|spam|trash a set of objects. */
export async function bulkAction(
  body: BulkActionBody
): Promise<{ processed: number; failed?: number }> {
  try {
    const res = await client.post<{ processed: number; failed?: number }>(
      '/moderation/bulk',
      body
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /moderation/ban — ban a user (optionally space-scoped / time-boxed). */
export async function banUser(body: BanBody): Promise<{ id: number }> {
  try {
    const res = await client.post<{ id: number }>('/moderation/ban', body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE /moderation/ban/{id} — lift a ban. */
export async function unbanUser(banId: number): Promise<{ deleted: true }> {
  try {
    const res = await client.delete<{ deleted: true }>(`/moderation/ban/${banId}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export interface FlagsQuery {
  status?: string;
  page?: number;
  per_page?: number;
}

/** GET /moderation/flags — global flags list. */
export async function listFlags(
  q: FlagsQuery = {}
): Promise<ListEnvelope<Flag>> {
  try {
    const res = await client.get<ListEnvelope<Flag>>('/moderation/flags', {
      params: { status: q.status, page: q.page, per_page: q.per_page },
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /moderation/flags/{id}/resolve. */
export async function resolveFlag(
  id: number,
  body: ResolveFlagBody = {}
): Promise<{ ok: true }> {
  try {
    const res = await client.post<{ ok: true }>(
      `/moderation/flags/${id}/resolve`,
      body
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /posts/{id}/flags — flags filed against one post. */
export async function getPostFlags(postId: number): Promise<Flag[]> {
  try {
    const res = await client.get<ListEnvelope<Flag> | Flag[]>(
      `/posts/${postId}/flags`
    );
    const body = res.data as ListEnvelope<Flag> | Flag[];
    return Array.isArray(body) ? body : body.data;
  } catch (e) {
    throw toApiError(e);
  }
}

// ---- Per-space moderation (scoped; 403 = "not your space") ----

/** GET /spaces/{id}/moderation/flags — this space's flags. */
export async function listSpaceFlags(
  spaceId: number,
  q: FlagsQuery = {}
): Promise<ListEnvelope<Flag>> {
  try {
    const res = await client.get<ListEnvelope<Flag>>(
      `/spaces/${spaceId}/moderation/flags`,
      { params: { status: q.status, page: q.page, per_page: q.per_page } }
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /spaces/{id}/moderation/flags/{flag_id}/resolve. */
export async function resolveSpaceFlag(
  spaceId: number,
  flagId: number,
  body: ResolveFlagBody = {}
): Promise<{ ok: true }> {
  try {
    const res = await client.post<{ ok: true }>(
      `/spaces/${spaceId}/moderation/flags/${flagId}/resolve`,
      body
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /spaces/{id}/moderation/{action}/{type}/{obj_id}. */
export async function actOnSpaceObject(
  spaceId: number,
  action: ModerationAction,
  type: ModeratedType,
  objId: number
): Promise<{ ok: true }> {
  try {
    const res = await client.post<{ ok: true }>(
      `/spaces/${spaceId}/moderation/${action}/${type}/${objId}`
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
