// types/message.ts — one message in a conversation (A4). From `format_message()`.

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  /** 'Deleted User' fallback server-side. */
  sender_name: string;
  /** 40px. */
  sender_avatar: string;
  /** rendered HTML → ContentBody. */
  content: string;
  content_plain: string;
  /** join/leave/system notices → render centered, no bubble. */
  is_system: boolean;
  /** ISO. */
  created_at: string;
  /** pre-localised time_format string from the server. */
  created_at_human: string;
}

/** Client-only delivery state for optimistic sends (never from the server). */
export type MessageDeliveryState = 'sent' | 'pending' | 'failed';

/** A message plus its optimistic delivery state, used inside the thread screen. */
export interface ThreadMessage extends Message {
  _delivery?: MessageDeliveryState;
}
