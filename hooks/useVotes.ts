// hooks/useVotes.ts — vote mutation helper used by VoteButton, plus a tiny
// Zustand slice holding the viewer's current per-object vote value (the API
// returns the new score but NOT the viewer's value, so we track it locally).

import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';

import { toApiError } from '@/api/client';
import { unvotePost, unvoteReply, votePost, voteReply } from '@/api/votes';

export type VoteKind = 'post' | 'reply';
export type VoteValue = 1 | -1 | 0;

function keyOf(kind: VoteKind, id: number): string {
  return `${kind}:${id}`;
}

interface VoteSliceState {
  /** key `${kind}:${id}` → viewer's current value. */
  values: Record<string, VoteValue>;
  setValue: (key: string, value: VoteValue) => void;
}

/** Module-level slice (in-lane: lives inside the hook Content owns). */
const useVoteSlice = create<VoteSliceState>((set) => ({
  values: {},
  setValue: (key, value) =>
    set((s) => ({ values: { ...s.values, [key]: value } })),
}));

export interface UseVoteArgs {
  kind: VoteKind;
  id: number;
  /** Seed from `viewer_vote` (1/-1/0) when the API exposes it; else 0. */
  seedValue?: VoteValue;
  /** Seed from `vote_score`. */
  seedScore: number;
}

export interface UseVoteResult {
  value: VoteValue;
  score: number;
  pending: boolean;
  error: string | null;
  /** Apply the viewer's next desired value (0 = remove). */
  vote: (next: VoteValue) => void;
}

export function useVote({
  kind,
  id,
  seedValue = 0,
  seedScore,
}: UseVoteArgs): UseVoteResult {
  const key = keyOf(kind, id);
  const storedValue = useVoteSlice((s) => s.values[key]);
  const setStoredValue = useVoteSlice((s) => s.setValue);

  // Seed the slice once (from server payload) if we have no value yet.
  useEffect(() => {
    if (storedValue === undefined) setStoredValue(key, seedValue);
  }, [key, seedValue, storedValue, setStoredValue]);

  const value: VoteValue = storedValue ?? seedValue;

  const [score, setScore] = useState(seedScore);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep score in sync when the server payload changes (refetch / new prop).
  useEffect(() => {
    setScore(seedScore);
  }, [seedScore]);

  const vote = useCallback(
    (next: VoteValue) => {
      if (next === value || pending) {
        if (next === value) return; // no-op tap-on-same handled by caller passing 0
      }
      const prevValue = value;
      const prevScore = score;
      const delta = next - prevValue;

      // Optimistic.
      setError(null);
      setStoredValue(key, next);
      setScore(prevScore + delta);
      setPending(true);

      const run = async () => {
        try {
          let resScore: number;
          if (next === 0) {
            const res =
              kind === 'post' ? await unvotePost(id) : await unvoteReply(id);
            resScore = res.score;
          } else {
            const res =
              kind === 'post'
                ? await votePost(id, next)
                : await voteReply(id, next);
            resScore = res.score;
            // If the server reports a removal (re-cast toggled off), reflect it.
            if (res.action === 'removed') setStoredValue(key, 0);
          }
          setScore(resScore);
        } catch (e) {
          const apiErr = toApiError(e);
          // Rollback.
          setStoredValue(key, prevValue);
          setScore(prevScore);
          setError(apiErr.message);
        } finally {
          setPending(false);
        }
      };
      void run();
    },
    [value, pending, score, key, kind, id, setStoredValue]
  );

  return { value, score, pending, error, vote };
}
