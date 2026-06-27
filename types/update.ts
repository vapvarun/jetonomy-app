// types/update.ts — activity-log delta rows (global/space) or reply-id list (post scope).

export type UpdateScope = 'global' | 'space' | 'post';

export interface ActivityRow {
  action: string;
  object_type: 'post' | 'reply' | string;
  object_id: number;
  created_at: string;
}

export interface UpdatesResponse {
  /** number[] when scope='post' (new reply ids); ActivityRow[] otherwise. */
  data: ActivityRow[] | number[];
  since: string;
  scope: UpdateScope;
  meta: { count: number; has_more: boolean };
}
