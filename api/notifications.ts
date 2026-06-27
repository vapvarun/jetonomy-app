// api/notifications.ts — notification feed + unread count (free).

import { client, toApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type {
  BulkAction,
  NotificationFilter,
  NotificationItem,
} from '@/types/notification';

export interface ListNotificationsQuery {
  filter?: NotificationFilter;
  limit?: number;
  offset?: number;
}

/** GET /notifications — filtered, paginated feed. */
export async function listNotifications(
  q: ListNotificationsQuery = {}
): Promise<ListEnvelope<NotificationItem>> {
  try {
    const res = await client.get<ListEnvelope<NotificationItem>>('/notifications', {
      params: { filter: q.filter ?? 'all', limit: q.limit, offset: q.offset },
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /notifications/unread-count — feeds the tab badge. */
export async function unreadCount(): Promise<{ count: number }> {
  try {
    const res = await client.get<{ count: number }>('/notifications/unread-count');
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** PATCH /notifications/{id} — mark one read; returns the updated row. */
export async function markRead(id: number): Promise<NotificationItem> {
  try {
    const res = await client.patch<NotificationItem>(`/notifications/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE /notifications/{id} — dismiss one. */
export async function dismiss(id: number): Promise<{ deleted: true }> {
  try {
    const res = await client.delete<{ deleted: true }>(`/notifications/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /notifications/mark-all-read — clears every unread. */
export async function markAllRead(): Promise<{ updated: number }> {
  try {
    const res = await client.post<{ updated: number }>(
      '/notifications/mark-all-read'
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /notifications/bulk — mark_read | delete a set of ids. */
export async function bulk(body: {
  action: BulkAction;
  ids: number[];
}): Promise<{ updated?: number; deleted?: number }> {
  try {
    const res = await client.post<{ updated?: number; deleted?: number }>(
      '/notifications/bulk',
      body
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
