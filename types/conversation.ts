// types/conversation.ts — Pro private messaging (A4). Transcribed from
// `format_conversation()` + `get_participants()` in the Private_Messaging extension.

export type ConversationType = 'direct' | 'group';

export interface Participant {
  user_id: number;
  display_name: string;
  /** 40px get_avatar_url. */
  avatar: string;
  last_read_at: string | null;
  is_muted: boolean;
  is_archived: boolean;
  left_at: string | null;
  /** server stores the block on the OTHER participant's row. */
  is_blocked: boolean;
  joined_at: string;
}

export interface Conversation {
  id: number;
  /** for 'direct' without a title the server fills the other person's name. */
  title: string;
  type: ConversationType;
  created_by: number;
  participants: Participant[];
  last_message_at: string | null;
  last_message_preview: string | null;
  message_count: number;
  /** derived server-side vs MY last_read_at. */
  unread: boolean;
  /** MY participant row. */
  is_muted: boolean;
  /** MY participant row. */
  is_archived: boolean;
  /** MY participant row. */
  left_at: string | null;
  /** did *I* block the other side (direct only). */
  is_blocked: boolean;
  created_at: string;
}

export type ConversationFilter = 'active' | 'archived';

/** GET /messaging/recipient-suggestions row (own shape, NOT PublicUser). */
export interface RecipientSuggestion {
  id: number;
  user_login: string;
  display_name: string;
  /** 32px. */
  avatar_url: string;
}
