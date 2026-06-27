// api/webhooks.ts — outgoing webhooks CRUD + test delivery (Pro, manage_options).

import { client, toApiError } from '@/api/client';
import type {
  CreateWebhookBody,
  UpdateWebhookBody,
  Webhook,
  WebhookTestResult,
} from '@/types/webhooks';

/** GET /webhooks. */
export async function list(): Promise<Webhook[]> {
  try {
    const res = await client.get<Webhook[] | { data: Webhook[] }>('/webhooks');
    const body = res.data;
    return Array.isArray(body) ? body : body.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /webhooks. */
export async function create(body: CreateWebhookBody): Promise<Webhook> {
  try {
    const res = await client.post<Webhook>('/webhooks', body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** PATCH /webhooks/{id}. */
export async function update(
  id: number,
  body: UpdateWebhookBody
): Promise<Webhook> {
  try {
    const res = await client.patch<Webhook>(`/webhooks/${id}`, body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** DELETE /webhooks/{id}. */
export async function remove(id: number): Promise<{ deleted: true }> {
  try {
    const res = await client.delete<{ deleted: true }>(`/webhooks/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /webhooks/{id}/test. */
export async function test(id: number): Promise<WebhookTestResult> {
  try {
    const res = await client.post<WebhookTestResult>(`/webhooks/${id}/test`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
