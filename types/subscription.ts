// types/subscription.ts — `prepare_subscription()`.
// Note: `via` maps from DB column `notify_via` — read `via` only.

export type SubscriptionObjectType = 'space' | 'post';
export type SubscriptionVia = 'web' | 'email' | 'both';

export interface Subscription {
  /** row id — the DELETE key (NOT object_id). */
  id: number;
  user_id: number;
  object_type: SubscriptionObjectType;
  object_id: number;
  via: SubscriptionVia;
  created_at: string | null;
}
