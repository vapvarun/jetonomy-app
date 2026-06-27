// api/conversations.ts — Pro private messaging endpoints (jetonomy/v1).
// Thin wrappers over the foundation `client` (Basic auth, no nonces). Every call
// throws a normalized ApiError via toApiError. All four action routes
// (mute/archive/leave/block) return the freshly formatted Conversation — write it
// straight back into cache, no refetch. See 05-pro-social.md.

import { client, toApiError } from '@/api/client';
import type {
  Conversation,
  ConversationFilter,
  RecipientSuggestion,
} from '@/types/conversation';
import type { Message } from '@/types/message';

/** Unwrap either a bare array or a `{ data: [] }` envelope into a typed array. */
function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

/** GET /conversations — list (active|archived), offset-paginated. */
export async function listConversations(p: {
  limit?: number;
  offset?: number;
  filter?: ConversationFilter;
} = {}): Promise<Conversation[]> {
  try {
    const res = await client.get('/conversations', {
      params: {
        limit: p.limit ?? 20,
        offset: p.offset ?? 0,
        filter: p.filter ?? 'active',
      },
    });
    return asArray<Conversation>(res.data);
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /conversations/{id}. */
export async function getConversation(id: number): Promise<Conversation> {
  try {
    const res = await client.get<Conversation>(`/conversations/${id}`);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /conversations — create with first message. */
export async function createConversation(b: {
  recipient_ids: number[];
  message: string;
  title?: string;
}): Promise<Conversation> {
  try {
    const res = await client.post<Conversation>('/conversations', b);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /conversations/{id}/messages — cursor pagination via `before` (message id). */
export async function listMessages(
  id: number,
  p: { before?: number; limit?: number } = {}
): Promise<Message[]> {
  try {
    const res = await client.get(`/conversations/${id}/messages`, {
      params: { before: p.before ?? 0, limit: p.limit ?? 30 },
    });
    return asArray<Message>(res.data);
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /conversations/{id}/messages. */
export async function sendMessage(id: number, content: string): Promise<Message> {
  try {
    const res = await client.post<Message>(`/conversations/${id}/messages`, {
      content,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/**
 * POST /conversations/{id}/mute. Preferred over PATCH is_muted — the action route
 * returns the full Conversation.
 */
export async function setMuted(id: number, muted: boolean): Promise<Conversation> {
  try {
    const res = await client.post<Conversation>(`/conversations/${id}/mute`, {
      muted,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /conversations/{id}/archive. */
export async function archive(id: number, archived: boolean): Promise<Conversation> {
  try {
    const res = await client.post<Conversation>(`/conversations/${id}/archive`, {
      archived,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /conversations/{id}/leave. */
export async function leave(id: number): Promise<Conversation> {
  try {
    const res = await client.post<Conversation>(`/conversations/${id}/leave`, {});
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /conversations/{id}/block (direct only). */
export async function block(id: number, blocked: boolean): Promise<Conversation> {
  try {
    const res = await client.post<Conversation>(`/conversations/${id}/block`, {
      blocked,
    });
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /conversations/unread-count → a plain number (tolerant of {count}/{unread}). */
export async function unreadCount(): Promise<number> {
  try {
    const res = await client.get('/conversations/unread-count');
    const d = res.data as unknown;
    if (typeof d === 'number') return d;
    if (d && typeof d === 'object') {
      const obj = d as { count?: number; unread?: number; unread_count?: number };
      return obj.count ?? obj.unread ?? obj.unread_count ?? 0;
    }
    return 0;
  } catch (e) {
    throw toApiError(e);
  }
}

/** GET /messaging/recipient-suggestions — caller enforces q.length >= 3. */
export async function recipientSuggestions(
  q: string
): Promise<RecipientSuggestion[]> {
  try {
    const res = await client.get('/messaging/recipient-suggestions', {
      params: { q },
    });
    return asArray<RecipientSuggestion>(res.data);
  } catch (e) {
    throw toApiError(e);
  }
}
