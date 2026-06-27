// hooks/usePoll.ts — optimistic poll voting for a post. Gated on features.polls.
// Seeds from the inlined Post.poll seam when present, else lazy GET (404 → null →
// PollView renders null). Always reconciles to the authoritative `.data` returned
// by every mutation; rolls back + surfaces an error on failure.

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { toApiError } from '@/api/client';
import { closePoll, getPollForPost, removeVote, vote } from '@/api/polls';
import { useFeatures } from '@/stores/authStore';
import type { Poll, PollOption } from '@/types/poll';

export interface UsePollResult {
  poll: Poll | null;
  loading: boolean;
  pending: boolean;
  error: string | null;
  /** cast/switch a vote on an option (no-op when closed). */
  castVote: (optionId: number) => void;
  /** retract the caller's vote(s). */
  retract: () => void;
  /** author-only: close (or reopen) the poll. */
  setClose: (closed: boolean) => void;
}

/** Recompute total_votes + each option percentage from option vote_counts. */
function recompute(poll: Poll): Poll {
  const total = poll.options.reduce((sum, o) => sum + o.vote_count, 0);
  return {
    ...poll,
    total_votes: total,
    options: poll.options.map((o) => ({
      ...o,
      percentage: total > 0 ? Math.round((o.vote_count / total) * 1000) / 10 : 0,
    })),
  };
}

function bump(options: PollOption[], id: number, delta: number): PollOption[] {
  return options.map((o) =>
    o.id === id ? { ...o, vote_count: Math.max(0, o.vote_count + delta) } : o
  );
}

export function usePoll(postId: number, seed?: Poll | null): UsePollResult {
  const { polls: enabled } = useFeatures();
  const [poll, setPoll] = useState<Poll | null>(seed ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lazy = useQuery({
    queryKey: ['poll', postId],
    queryFn: () => getPollForPost(postId),
    enabled: enabled && !seed,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (lazy.data !== undefined && lazy.isSuccess) setPoll(lazy.data);
  }, [lazy.data, lazy.isSuccess]);

  const castVote = useCallback(
    (optionId: number) => {
      const prev = poll;
      if (!prev || prev.closed || pending) return;

      const already = prev.user_votes.includes(optionId);
      let nextVotes: number[];
      let nextOptions = prev.options;
      let voterDelta = 0;

      if (prev.type === 'single') {
        if (already) return; // re-tapping the same single choice is a no-op
        const hadAny = prev.user_votes.length > 0;
        prev.user_votes.forEach((oid) => {
          nextOptions = bump(nextOptions, oid, -1);
        });
        nextOptions = bump(nextOptions, optionId, 1);
        nextVotes = [optionId];
        voterDelta = hadAny ? 0 : 1;
      } else {
        if (already) {
          nextOptions = bump(nextOptions, optionId, -1);
          nextVotes = prev.user_votes.filter((oid) => oid !== optionId);
          voterDelta = nextVotes.length === 0 ? -1 : 0;
        } else {
          const hadAny = prev.user_votes.length > 0;
          nextOptions = bump(nextOptions, optionId, 1);
          nextVotes = [...prev.user_votes, optionId];
          voterDelta = hadAny ? 0 : 1;
        }
      }

      const optimistic = recompute({
        ...prev,
        options: nextOptions,
        user_votes: nextVotes,
        total_voters: Math.max(0, prev.total_voters + voterDelta),
      });
      setPoll(optimistic);
      setError(null);
      setPending(true);

      const run = async () => {
        try {
          const sel =
            prev.type === 'single'
              ? { option_id: optionId }
              : { option_ids: nextVotes };
          const fresh = await vote(prev.id, sel);
          setPoll(fresh);
        } catch (e) {
          setPoll(prev); // rollback
          setError(toApiError(e).message);
        } finally {
          setPending(false);
        }
      };
      void run();
    },
    [poll, pending]
  );

  const retract = useCallback(() => {
    const prev = poll;
    if (!prev || prev.closed || pending || prev.user_votes.length === 0) return;
    setPending(true);
    setError(null);
    const run = async () => {
      try {
        const fresh = await removeVote(prev.id);
        setPoll(fresh);
      } catch (e) {
        setError(toApiError(e).message);
      } finally {
        setPending(false);
      }
    };
    void run();
  }, [poll, pending]);

  const setClose = useCallback(
    (closed: boolean) => {
      const prev = poll;
      if (!prev || pending) return;
      setPending(true);
      setError(null);
      // Close → now; reopen → far-future sentinel so is_closed() is false.
      const closesAt = closed
        ? new Date().toISOString()
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const run = async () => {
        try {
          const fresh = await closePoll(prev.id, closesAt);
          setPoll(fresh);
        } catch (e) {
          setError(toApiError(e).message);
        } finally {
          setPending(false);
        }
      };
      void run();
    },
    [poll, pending]
  );

  return {
    poll,
    loading: enabled && !seed && lazy.isLoading,
    pending,
    error,
    castVote,
    retract,
    setClose,
  };
}
