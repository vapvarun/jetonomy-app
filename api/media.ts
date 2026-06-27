// api/media.ts — image upload (canonical, reused by Compose) + admin media list.

import { client, toApiError } from '@/api/client';

/** POST /media response. */
export interface UploadedMedia {
  id: number;
  url: string;
  alt: string;
  mime: string;
  width: number;
  height: number;
}

/** GET /media row (admin-only list). */
export interface MediaItem {
  id: number;
  url: string;
  thumb: string;
  title: string;
  mime: string;
  author: number;
  space_id: number | null;
  date: string;
}

export interface MediaListMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface MediaListResponse {
  data: MediaItem[];
  meta: MediaListMeta;
}

/**
 * POST /media — multipart upload. Field name MUST be `file` (controller reads
 * $_FILES['file']). RN: append { uri, name, type } and let axios set the
 * multipart boundary. This is the canonical image upload the Compose domain
 * reuses.
 */
export async function uploadMedia(
  fileUri: string,
  opts?: { alt?: string; spaceId?: number; name?: string; type?: string }
): Promise<UploadedMedia> {
  const form = new FormData();
  const name = opts?.name ?? fileUri.split('/').pop() ?? 'upload.jpg';
  const type = opts?.type ?? guessMime(name);
  // RN FormData file part — typed as any per RN/Expo convention.
  form.append('file', { uri: fileUri, name, type } as unknown as Blob);
  if (opts?.alt) form.append('alt', opts.alt);
  if (opts?.spaceId != null) form.append('space_id', String(opts.spaceId));

  try {
    const res = await client.post<UploadedMedia>('/media', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/**
 * GET /media — admin-only (jetonomy_manage_settings). 403s for normal members;
 * surface only behind an admin/owner gate.
 */
export async function listCommunityMedia(params?: {
  page?: number;
  per_page?: number;
  author?: number;
  space_id?: number;
  search?: string;
  order?: 'asc' | 'desc';
}): Promise<MediaListResponse> {
  try {
    const res = await client.get<MediaListResponse>('/media', { params });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    default:
      return 'image/jpeg';
  }
}
