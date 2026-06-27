// hooks/useSubscriptions.ts — the member's subscriptions + optimistic toggle.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSubscription,
  deleteSubscription,
  listSubscriptions,
} from '@/api/subscriptions';
import type { ListEnvelope } from '@/types/api';
import type {
  Subscription,
  SubscriptionObjectType,
  SubscriptionVia,
} from '@/types/subscription';

/** GET /subscriptions (own rows). */
export function useSubscriptions() {
  const query = useQuery<ListEnvelope<Subscription>, Error>({
    queryKey: ['subscriptions'],
    queryFn: () => listSubscriptions({ limit: 100 }),
  });
  const subscriptions: Subscription[] = query.data?.data ?? [];
  return { ...query, subscriptions };
}

/** Find the existing subscription row for an object in the list cache. */
function findSub(
  list: Subscription[] | undefined,
  objectType: SubscriptionObjectType,
  objectId: number
): Subscription | undefined {
  return list?.find(
    (s) => s.object_type === objectType && s.object_id === objectId
  );
}

/** Read current subscribed-state for an object from the list cache. */
export function useIsSubscribed(
  objectType: SubscriptionObjectType,
  objectId: number
): { subscribed: boolean; sub: Subscription | undefined } {
  const { subscriptions } = useSubscriptions();
  const sub = findSub(subscriptions, objectType, objectId);
  return { subscribed: !!sub, sub };
}

interface ToggleVars {
  /** desired next state. */
  subscribe: boolean;
  via?: SubscriptionVia;
}

/**
 * Optimistic subscribe/unsubscribe for one object. Unsubscribe must resolve the
 * subscription ROW id from the list cache (gotcha #3 — DELETE keys on row id).
 */
export function useToggleSubscription(
  objectType: SubscriptionObjectType,
  objectId: number
) {
  const qc = useQueryClient();
  const key = ['subscriptions'] as const;

  return useMutation<unknown, Error, ToggleVars, { prev?: ListEnvelope<Subscription> }>({
    mutationFn: async ({ subscribe, via = 'both' }) => {
      const cache = qc.getQueryData<ListEnvelope<Subscription>>(key);
      const existing = findSub(cache?.data, objectType, objectId);
      if (subscribe) {
        return createSubscription({ object_type: objectType, object_id: objectId, via });
      }
      if (existing) return deleteSubscription(existing.id);
      return { deleted: true };
    },
    onMutate: async ({ subscribe, via = 'both' }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ListEnvelope<Subscription>>(key);
      if (prev) {
        let data = prev.data;
        if (subscribe) {
          if (!findSub(data, objectType, objectId)) {
            data = [
              ...data,
              {
                id: -Date.now(), // temp optimistic id, reconciled on settle
                user_id: 0,
                object_type: objectType,
                object_id: objectId,
                via,
                created_at: null,
              },
            ];
          }
        } else {
          data = data.filter(
            (s) => !(s.object_type === objectType && s.object_id === objectId)
          );
        }
        qc.setQueryData<ListEnvelope<Subscription>>(key, { ...prev, data });
      }
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Standalone unsubscribe by row id (used by the subscriptions list rows). */
export function useUnsubscribe() {
  const qc = useQueryClient();
  return useMutation<{ deleted: true; id: number }, Error, number, { prev?: ListEnvelope<Subscription> }>({
    mutationFn: (id) => deleteSubscription(id),
    onMutate: async (id) => {
      const key = ['subscriptions'] as const;
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ListEnvelope<Subscription>>(key);
      if (prev) {
        qc.setQueryData<ListEnvelope<Subscription>>(key, {
          ...prev,
          data: prev.data.filter((s) => s.id !== id),
        });
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['subscriptions'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}
