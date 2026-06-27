// types/webhooks.ts — outgoing webhook shapes (Pro).

/** A configured outgoing webhook. */
export interface Webhook {
  id: number;
  url: string;
  events: string[];
  active: boolean;
  last_status: number | null;
  last_delivered_at?: string | null;
  created_at?: string | null;
}

/** Body for POST /webhooks. */
export interface CreateWebhookBody {
  url: string;
  events: string[];
  secret?: string;
  active?: boolean;
}

/** Body for PATCH /webhooks/{id}. */
export type UpdateWebhookBody = Partial<CreateWebhookBody>;

/** Result of POST /webhooks/{id}/test. */
export interface WebhookTestResult {
  delivered: boolean;
  status: number | null;
  response_body?: string | null;
  error?: string | null;
}
