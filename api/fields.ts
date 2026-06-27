// api/fields.ts — custom profile/post fields [PRO]. Registers on jetonomy/v1, so
// it uses the same foundation `client` — there is no separate Pro host.
//
// Member app uses the read + own-write subset. Admin CRUD is typed as seams
// (manage_options) but never wired to member UI. Post-field fns are owned by
// Content (02) compose/detail — exported here, consumed there.

import { client, toApiError } from '@/api/client';
import type { FieldDef, FieldValueMap } from '@/types/customField';

export interface ListFieldsQuery {
  /** 'user' | 'post'. */
  context?: string;
  space_id?: number;
}

/** GET /fields — field definitions for a context. */
export async function listFields(
  q: ListFieldsQuery = {}
): Promise<{ data: FieldDef[] }> {
  try {
    const res = await client.get<{ data: FieldDef[] }>('/fields', { params: q });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /users/{id}/fields — resolved values keyed by slug. */
export async function getUserFields(id: number): Promise<{ data: FieldValueMap }> {
  try {
    const res = await client.get<{ data: FieldValueMap }>(`/users/${id}/fields`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** PATCH /users/me/fields — the ONLY profile-field write the member app calls. */
export async function updateMyFields(
  values: Record<string, string | null>
): Promise<{ data: FieldValueMap }> {
  try {
    const res = await client.patch<{ data: FieldValueMap }>('/users/me/fields', {
      values,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

// ---- Post-field surface — OWNED BY Content (02). Exported only. ----

/** GET /posts/{id}/fields — Content (02) post detail consumes this. */
export async function getPostFields(
  postId: number
): Promise<{ data: FieldValueMap }> {
  try {
    const res = await client.get<{ data: FieldValueMap }>(`/posts/${postId}/fields`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** PATCH /posts/{id}/fields — Content (02) compose flow consumes this. */
export async function updatePostFields(
  postId: number,
  values: Record<string, string | null>
): Promise<{ data: FieldValueMap }> {
  try {
    const res = await client.patch<{ data: FieldValueMap }>(
      `/posts/${postId}/fields`,
      { values }
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

// ---- Admin CRUD — typed seams (manage_options). NOT wired to member UI. ----

export async function createField(body: Partial<FieldDef>): Promise<FieldDef> {
  try {
    const res = await client.post<FieldDef>('/fields', body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function updateField(
  id: number,
  body: Partial<FieldDef>
): Promise<FieldDef> {
  try {
    const res = await client.patch<FieldDef>(`/fields/${id}`, body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function deleteField(id: number): Promise<{ deleted: true }> {
  try {
    const res = await client.delete<{ deleted: true }>(`/fields/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
