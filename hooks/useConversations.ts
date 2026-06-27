// hooks/useConversations.ts — messaging data layer (gated features.messaging).
// Conversation list = offset pagination, polled ~30s on focus. Thread = `before`
// message-id cursor (newest-first → inverted list), polled ~10s. Unread count =
// shared 30s poll that also drives the tab badge. Action mutations (mute/archive/
// leave/block) write the returned Conversation straight back into both caches.

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import {
  archive,
  block,
  getConversation,
  leave,
  listConversations,
  listMessages,
  sendMessage,
  setMuted,
  unreadCount,
} from '@/api/conversations';
import { useFeatures } from '@/stores/authStore';
import type { Conversation, ConversationFilter } from '@/types/conversation';
import type { Message } from '@/types/message';

const LIST_PAGE = 20;
const MSG_PAGE = 30;

type ConvPages = InfiniteData<Conversation[]>;
type MsgPages = InfiniteData<Message[]>;

// ---- Conversation list ----------------------------------------------------

export function useConversationList(filter: ConversationFilter) {
  const { messaging } = useFeatures();
  const query = useInfiniteQuery<Conversation[], Error>({
    queryKey: ['conversations', filter],
    enabled: messaging,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listConversations({
        filter,
        offset: pageParam as number,
        limit: LIST_PAGE,
      }),
    getNextPageParam: (last, all) =>
      last.length === LIST_PAGE ? all.length * LIST_PAGE : undefined,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const conversations: Conversation[] = query.data?.pages.flat() ?? [];
  return { ...query, conversations };
}

// ---- Single thread (header + messages) ------------------------------------

export function useConversationThread(id: number) {
  const { messaging } = useFeatures();

  const header = useQuery<Conversation, Error>({
    queryKey: ['conversation', id],
    enabled: messaging && Number.isFinite(id),
    queryFn: () => getConversation(id),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const messages = useInfiniteQuery<Message[], Error>({
    queryKey: ['messages', id],
    enabled: messaging && Number.isFinite(id),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listMessages(id, { before: pageParam as number, limit: MSG_PAGE }),
    // Each page is newest-first; the LAST page holds the oldest chunk. The next
    // `before` cursor is the oldest id we have loaded.
    getNextPageParam: (last) =>
      last.length === MSG_PAGE ? last[last.length - 1]?.id : undefined,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  // Flattened newest-first (matches inverted FlatList ordering).
  const list: Message[] = messages.data?.pages.flat() ?? [];

  return { header, messages, list };
}

// ---- Unread count (shared 30s poll, drives the tab badge) ------------------

export function useUnreadCount() {
  const { messaging } = useFeatures();
  return useQuery<number, Error>({
    queryKey: ['conversations', 'unread'],
    enabled: messaging,
    queryFn: () => unreadCount(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

// ---- Mutations ------------------------------------------------------------

/** Write a freshly returned Conversation back into list pages + detail cache. */
function patchConversationCaches(
  qc: ReturnType<typeof useQueryClient>,
  convo: Conversation
) {
  qc.setQueryData<Conversation>(['conversation', convo.id], convo);
  qc.setQueriesData<ConvPages>(
    { queryKey: ['conversations'] },
    (data: ConvPages | undefined) => {
      // Matches every ['conversations', ...] key incl. the numeric unread-count.
      if (!data || typeof data !== 'object' || !('pages' in data)) return data;
      return {
        ...data,
        pages: data.pages.map((page: Conversation[]) =>
          page.map((c: Conversation) => (c.id === convo.id ? convo : c))
        ),
      };
    }
  );
}

export function useSendMessage(id: number) {
  const qc = useQueryClient();
  return useMutation<Message, Error, string>({
    mutationFn: (content) => sendMessage(id, content),
    onSuccess: () => {
      // The new message arrives via the thread poll/refetch; bump both surfaces.
      qc.invalidateQueries({ queryKey: ['messages', id] });
      qc.invalidateQueries({ queryKey: ['conversation', id] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMuteConversation() {
  const qc = useQueryClient();
  return useMutation<Conversation, Error, { id: number; muted: boolean }>({
    mutationFn: ({ id, muted }) => setMuted(id, muted),
    onSuccess: (convo) => patchConversationCaches(qc, convo),
  });
}

export function useArchiveConversation() {
  const qc = useQueryClient();
  return useMutation<Conversation, Error, { id: number; archived: boolean }>({
    mutationFn: ({ id, archived }) => archive(id, archived),
    onSuccess: (convo) => {
      patchConversationCaches(qc, convo);
      // Moved between active/archived buckets — refresh both lists.
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useLeaveConversation() {
  const qc = useQueryClient();
  return useMutation<Conversation, Error, number>({
    mutationFn: (id) => leave(id),
    onSuccess: (convo) => {
      patchConversationCaches(qc, convo);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useBlockConversation() {
  const qc = useQueryClient();
  return useMutation<Conversation, Error, { id: number; blocked: boolean }>({
    mutationFn: ({ id, blocked }) => block(id, blocked),
    onSuccess: (convo) => patchConversationCaches(qc, convo),
  });
}
