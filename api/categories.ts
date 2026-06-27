// api/categories.ts — categories tree + CRUD (CRUD is an admin-only seam).

import { client, toApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type {
  Category,
  CategoryTreeNode,
  CategoryWithSpaces,
} from '@/types/category';

/**
 * GET /categories → ListEnvelope<CategoryTreeNode> (nested spaces+children,
 * UNPAGINATED). Cache hard (staleTime) — see gotcha #6.
 */
export async function listCategories(): Promise<ListEnvelope<CategoryTreeNode>> {
  try {
    const res = await client.get<ListEnvelope<CategoryTreeNode>>('/categories');
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /categories/{id} → Category + embedded spaces. */
export async function getCategory(id: number): Promise<CategoryWithSpaces> {
  try {
    const res = await client.get<CategoryWithSpaces>(`/categories/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /categories → Category (201). Admin-only (jetonomy_manage_categories). */
export async function createCategory(
  body: Partial<Category> & { name: string }
): Promise<Category> {
  try {
    const res = await client.post<Category>('/categories', body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** PATCH /categories/{id} → Category. Admin-only. */
export async function updateCategory(
  id: number,
  patch: Partial<Category>
): Promise<Category> {
  try {
    const res = await client.patch<Category>(`/categories/${id}`, patch);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE /categories/{id} → {deleted, id}. Admin-only. */
export async function deleteCategory(
  id: number
): Promise<{ deleted: true; id: number }> {
  try {
    const res = await client.delete<{ deleted: true; id: number }>(
      `/categories/${id}`
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
