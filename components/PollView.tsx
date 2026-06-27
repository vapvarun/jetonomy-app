// components/PollView.tsx — NULL STUB (foundation seam).
//
// Content mounts this after ContentBody on PostDetail. The Pro-Social agent
// OVERWRITES this file with the real poll UI (gated on useFeatures().polls).
// Until then it renders null so the seam bundles green.

export interface PollOptionSeed {
  id: number;
  label: string;
  votes: number;
}

/** Seed poll summary the parent passes from post.poll. */
export interface PollSeed {
  id: number;
  question?: string;
  options?: PollOptionSeed[];
  total_votes?: number;
  my_vote?: number | number[] | null;
  closes_at?: string | null;
  [k: string]: unknown;
}

export interface PollViewProps {
  postId: number;
  seed?: PollSeed | null;
}

export default function PollView(_props: PollViewProps): null {
  return null;
}
