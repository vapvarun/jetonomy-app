// types/reaction.ts — Pro reactions (A4). Transcribed from the Reactions extension
// formatter: `emoji` is a SLUG, not a unicode char; RN maps slug→char locally via
// REACTION_EMOJI. The POST is a single toggle that returns the post-toggle state
// plus the `action` the server took. See 05-pro-social.md.

export type ReactionSlug =
  | 'thumbsup'
  | 'heart'
  | 'laugh'
  | 'hooray'
  | 'thinking'
  | 'eyes'
  | 'rocket'
  | 'thumbsdown';

/** Render map slug → unicode char (server render concern; RN maps locally). */
export const REACTION_EMOJI: Record<ReactionSlug, string> = {
  thumbsup: '👍',
  heart: '❤️',
  laugh: '😂',
  hooray: '🎉',
  thinking: '🤔',
  eyes: '👀',
  rocket: '🚀',
  thumbsdown: '👎',
};

/** Stable render order for the picker (all 8 offerable slugs). */
export const REACTION_ORDER: ReactionSlug[] = [
  'thumbsup',
  'heart',
  'laugh',
  'hooray',
  'thinking',
  'eyes',
  'rocket',
  'thumbsdown',
];

export type ReactionCounts = Partial<Record<ReactionSlug, number>>;

/** GET /posts|replies/{id}/reactions response. */
export interface ReactionData {
  /** Only slugs with >0 present. */
  counts: ReactionCounts;
  /** Slugs the caller has toggled on. */
  user_reactions: ReactionSlug[];
}

/** POST /posts|replies/{id}/reactions response (toggle). */
export interface ReactionToggleResponse extends ReactionData {
  action: 'added' | 'removed';
  emoji: ReactionSlug;
}

/** Type guard for a known slug (server may, rarely, disable some). */
export function isReactionSlug(value: unknown): value is ReactionSlug {
  return typeof value === 'string' && value in REACTION_EMOJI;
}
