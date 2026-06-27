// types/vote.ts — Vote::cast result merged with current score.

export interface VoteResponse {
  action: 'created' | 'removed' | 'updated' | 'none';
  old_value?: number | null;
  /** Authoritative new vote_score — reconcile optimistic UI against this. */
  score: number;
}
