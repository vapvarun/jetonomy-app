// components/FlagButton.tsx — NULL STUB (foundation seam).
//
// Content/Reply rows mount this to let members flag content. The Moderation/Admin
// agent OVERWRITES this file with the real flag flow. Until then it renders null
// so the seam bundles green.

export interface FlagTarget {
  kind: 'post' | 'reply';
  id: number;
}

export interface FlagButtonProps {
  target: FlagTarget;
  /** Optional compact rendering hint for dense list rows. */
  compact?: boolean;
}

export default function FlagButton(_props: FlagButtonProps): null {
  return null;
}
