// types/badge.ts — Pro custom-badge shapes (People domain 04 · [PRO]).
// Source: jetonomy-pro custom-badges extension (registers on jetonomy/v1).

export interface Badge {
  id: number;
  name: string;
  slug: string;
  description: string;
  /** Lucide icon name. */
  icon: string;
  /** bronze | silver | gold | ... */
  tier: string;
  category: string;
  criteria: unknown;
  reputation_bonus: number;
  is_repeatable: boolean;
  is_active: boolean;
  earned_count: number;
  created_at: string | null;
}

/** GET /users/{id}/badges row — a Badge the user has earned. */
export interface UserBadge extends Badge {
  earned_at: string;
  metadata: Record<string, unknown> | null;
}
