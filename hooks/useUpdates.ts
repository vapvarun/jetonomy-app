// hooks/useUpdates.ts — polls GET /updates (post scope) for the "N new replies" banner.

import { useQuery } from '@tanstack/react-query';

import { getUpdates } from '@/api/updates';
import type { UpdatesResponse } from '@/types/update';

/**
 * Poll a thread for new reply ids since `since`. Returns the response; the
 * screen derives the new-reply count from data.length (number[] in post scope).
 */
export function useNewReplies(postId: number, since: string, enabled = true) {
  return useQuery<UpdatesResponse, Error>({
    queryKey: ['updates', 'post', postId, since],
    queryFn: () => getUpdates({ scope: 'post', id: postId, since }),
    enabled: enabled && !!since,
    refetchInterval: 15_000,
    staleTime: 0,
    gcTime: 0,
  });
}

/** New-reply count helper (post-scope returns a number[] of reply ids). */
export function newReplyCount(res: UpdatesResponse | undefined): number {
  if (!res) return 0;
  return Array.isArray(res.data) ? res.data.length : 0;
}
