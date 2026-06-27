// api/subscriptions.ts — the member's own space/post subscriptions.

import { client, toApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type {
  Subscription,
  SubscriptionObjectType,
  SubscriptionVia,
} from '@/types/subscription';

export interface ListSubscriptionsQuery {
  object_type?: SubscriptionObjectType;
  limit?: number;
  after?: number;
  offset?: number;
}

/** GET /subscriptions → ListEnvelope<Subscription> (own rows only). */
export async function listSubscriptions(
  params: ListSubscriptionsQuery = {}
): Promise<ListEnvelope<Subscription>> {
  try {
    const res = await client.get<ListEnvelope<Subscription>>('/subscriptions', {
      params,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /subscriptions → Subscription (201 new / 200 dup). */
export async function createSubscription(body: {
  object_type: SubscriptionObjectType;
  object_id: number;
  via?: SubscriptionVia;
}): Promise<Subscription> {
  try {
    const res = await client.post<Subscription>('/subscriptions', body);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/**
 * DELETE /subscriptions/{id} → {deleted, id}.
 * ⚠ `id` = subscription ROW id (not object_id); ownership enforced (403).
 */
export async function deleteSubscription(
  id: number
): Promise<{ deleted: true; id: number }> {
  try {
    const res = await client.delete<{ deleted: true; id: number }>(
      `/subscriptions/${id}`
    );
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
