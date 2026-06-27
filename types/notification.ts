// types/notification.ts — notification feed shapes (People/Notifications domain 04).
// Source of truth: Notifications_Controller::prepare_notification (Jetonomy 1.5.x).

export type NotificationFilter =
  | 'all'
  | 'unread'
  | 'mentions'
  | 'replies'
  | 'votes'
  | 'badges';

/** Deep-link target kind. `object_url` is a WEB url — the app maps type+id → native routes. */
export type NotificationObjectType = 'post' | 'reply' | 'badge' | 'user' | null;

export interface NotificationItem {
  id: number;
  user_id: number;
  /** Raw event type, e.g. reply_to_post, mention, vote_on_post, badge_earned. */
  type: string;
  object_type: NotificationObjectType;
  object_id: number | null;
  actor_id: number | null;
  is_read: boolean;
  created_at: string | null;
  message: string;
  actor_name: string;
  actor_avatar: string;
  actor_login: string;
  time_ago: string;
  profile_url: string;
  /** WEB url; do NOT navigate to it — deep-link via object_type + object_id. */
  object_url: string;
}

export type BulkAction = 'mark_read' | 'delete';
