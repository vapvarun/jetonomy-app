// hooks/useReactions.ts — optimistic reaction toggling for a post or reply.
// Gated on features.reactions: when the flag is off the lazy GET is disabled and
// `ready` stays false so ReactionBar can render null. Seeds from the inlined
// Post.reactions / Reply.reactions when Content already provided them (no fetch).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { toApiError } from '@/api/client';
import {
  listPostReactions,
  listReplyReactions,
  togglePostReaction,
  toggleReplyReaction,
} from '@/api/reactions';
import { useFeatures } from '@/stores/authStore';
import type {
  ReactionCounts,
  ReactionData,
  ReactionSlug,
} from '@/types/reaction';
import { isReactionSlug } from '@/types/reaction';

export interface ReactionTargetRef {
  kind: 'post' | 'reply';
  id: number;
}

export interface UseReactionsResult {
  counts: ReactionCounts;
  userReactions: ReactionSlug[];
  /** Slugs with an in-flight toggle (de-dupe rapid taps). */
  busy: Set<ReactionSlug>;
  error: string | null;
  ready: boolean;
  toggle: (slug: ReactionSlug) => void;
}

/** Coerce a loose inlined seed (`{counts, user_reactions|mine}`) to ReactionData. */
function normalizeSeed(seed?: ReactionData | null): ReactionData | null {
  if (!seed || typeof seed !== 'object') return null;
  const loose = seed as { counts?: ReactionCounts; user_reactions?: unknown; mine?: unknown };
  const rawMine = Array.isArray(loose.user_reactions)
    ? loose.user_reactions
    : Array.isArray(loose.mine)
      ? loose.mine
      : [];
  return {
    counts: loose.counts ?? {},
    user_reactions: rawMine.filter(isReactionSlug),
  };
}

export function useReactions(
  target: ReactionTargetRef,
  seed?: ReactionData | null
): UseReactionsResult {
  const { reactions: enabled } = useFeatures();
  const seeded = normalizeSeed(seed);

  // Local authoritative state (optimistic source of truth for the UI).
  const [data, setData] = useState<ReactionData>(
    seeded ?? { counts: {}, user_reactions: [] }
  );
  const [hasData, setHasData] = useState<boolean>(!!seeded);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef<Set<ReactionSlug>>(new Set());
  const [busy, setBusy] = useState<Set<ReactionSlug>>(new Set());

  // Lazy fetch only when gated on, no seed, and we have nothing yet.
  const lazy = useQuery({
    queryKey: ['reactions', target.kind, target.id],
    queryFn: () =>
      target.kind === 'post'
        ? listPostReactions(target.id)
        : listReplyReactions(target.id),
    enabled: enabled && !seeded && !hasData,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (lazy.data) {
      setData(lazy.data);
      setHasData(true);
    }
  }, [lazy.data]);

  const syncBusy = useCallback(() => {
    setBusy(new Set(busyRef.current));
  }, []);

  const toggle = useCallback(
    (slug: ReactionSlug) => {
      if (!enabled || busyRef.current.has(slug)) return;
      busyRef.current.add(slug);
      syncBusy();
      setError(null);

      const prev = data;
      const wasOn = prev.user_reactions.includes(slug);
      const nextCount = (prev.counts[slug] ?? 0) + (wasOn ? -1 : 1);
      const nextCounts: ReactionCounts = { ...prev.counts };
      if (nextCount > 0) nextCounts[slug] = nextCount;
      else delete nextCounts[slug];
      const optimistic: ReactionData = {
        counts: nextCounts,
        user_reactions: wasOn
          ? prev.user_reactions.filter((s) => s !== slug)
          : [...prev.user_reactions, slug],
      };
      setData(optimistic);
      setHasData(true);

      const run = async () => {
        try {
          const res =
            target.kind === 'post'
              ? await togglePostReaction(target.id, slug)
              : await toggleReplyReaction(target.id, slug);
          // Reconcile to authoritative server truth.
          setData({ counts: res.counts, user_reactions: res.user_reactions });
        } catch (e) {
          setData(prev); // rollback
          setError(toApiError(e).message);
        } finally {
          busyRef.current.delete(slug);
          syncBusy();
        }
      };
      void run();
    },
    [enabled, data, target.kind, target.id, syncBusy]
  );

  return {
    counts: data.counts,
    userReactions: data.user_reactions,
    busy,
    error,
    ready: hasData || lazy.isSuccess,
    toggle,
  };
}
