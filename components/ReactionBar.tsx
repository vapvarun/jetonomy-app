// components/ReactionBar.tsx — NULL STUB (foundation seam).
//
// Content mounts this after ContentBody on PostDetail + ReplyItem. The Pro-Social
// agent OVERWRITES this file with the real reactions UI (gated on
// useFeatures().reactions). Until then it renders null so the seam bundles green
// with zero Pro imports in the parent.

export interface ReactionTarget {
  kind: 'post' | 'reply';
  id: number;
}

/** Seed reaction summary the parent passes from post.reactions / reply.reactions. */
export interface ReactionSeed {
  counts?: Record<string, number>;
  mine?: string[];
  total?: number;
  [k: string]: unknown;
}

export interface ReactionBarProps {
  target: ReactionTarget;
  seed?: ReactionSeed | null;
}

export default function ReactionBar(_props: ReactionBarProps): null {
  return null;
}
