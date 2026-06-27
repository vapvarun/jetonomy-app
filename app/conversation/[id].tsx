// app/conversation/[id].tsx — one conversation thread (Pro, gated). Inverted list
// of MessageBubble with `before`-cursor load-older, a kebab menu (mute/archive/
// leave/block), and an optimistic MessageComposer. New inbound messages arrive via
// the ~10s thread poll; optimistic temps live in local state and reconcile by id.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MoreHorizontal } from 'lucide-react-native';

import MessageBubble from '@/components/MessageBubble';
import MessageComposer from '@/components/MessageComposer';
import {
  useArchiveConversation,
  useBlockConversation,
  useConversationThread,
  useLeaveConversation,
  useMuteConversation,
  useSendMessage,
} from '@/hooks/useConversations';
import { useCurrentUser, useFeatures } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import type { Participant } from '@/types/conversation';
import type { ThreadMessage } from '@/types/message';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const { messaging } = useFeatures();
  const me = useCurrentUser();
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { header, messages, list } = useConversationThread(conversationId);
  const sendMsg = useSendMessage(conversationId);
  const muteM = useMuteConversation();
  const archiveM = useArchiveConversation();
  const leaveM = useLeaveConversation();
  const blockM = useBlockConversation();

  const [text, setText] = useState('');
  const [pending, setPending] = useState<ThreadMessage[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  // Deep-link safety: bounce home if messaging is off on this site.
  useEffect(() => {
    if (!messaging) router.replace('/');
  }, [messaging, router]);

  // Drop optimistic temps once the matching real message lands in the server list.
  useEffect(() => {
    if (pending.length === 0) return;
    const serverPlain = new Set(list.map((m) => m.content_plain.trim()));
    setPending((prev) =>
      prev.filter((t) => t._delivery === 'failed' || !serverPlain.has(t.content_plain.trim()))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  const convo = header.data;
  const isGroup = convo?.type === 'group';
  const left = !!convo?.left_at;
  const blocked = !!convo?.is_blocked;

  // Inverted list data: newest first. Pending (newest) sit above the server list.
  const data: ThreadMessage[] = useMemo(() => [...pending, ...list], [pending, list]);

  const doSend = useCallback(
    (body: string, retryOf?: ThreadMessage) => {
      const content = body.trim();
      if (!content) return;
      const tempId = retryOf?.id ?? -Date.now();
      const temp: ThreadMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: me?.user_id ?? 0,
        sender_name: me?.display_name ?? 'You',
        sender_avatar: (me?.avatar_url as string) ?? '',
        content,
        content_plain: content,
        is_system: false,
        created_at: new Date().toISOString(),
        created_at_human: 'now',
        _delivery: 'pending',
      };
      setPending((prev) => [temp, ...prev.filter((m) => m.id !== tempId)]);
      sendMsg.mutate(content, {
        onError: () => {
          setPending((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, _delivery: 'failed' } : m))
          );
        },
      });
    },
    [conversationId, me, sendMsg]
  );

  function handleSend() {
    if (!text.trim()) return;
    doSend(text);
    setText('');
  }

  // ---- States ----
  if (header.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }
  if (header.isError || !convo) {
    const status = (header.error as { status?: number } | null)?.status;
    const msg =
      status === 404
        ? 'Conversation not found.'
        : status === 403
          ? 'You are not a participant.'
          : 'Could not load this conversation.';
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[6] }}>
        <Text style={{ color: colors.text, fontSize: typography.size.lg }}>{msg}</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={{ color: colors.accent }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const peers = convo.participants.filter((p: Participant) => p.user_id !== me?.user_id);
  const avatarPeers = peers.length > 0 ? peers : convo.participants;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      {/* Top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[3],
          paddingBottom: spacing[2],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={colors.text} size={24} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing[2] }}>
          {avatarPeers[0]?.avatar ? (
            <Image source={{ uri: avatarPeers[0].avatar }} style={{ width: 30, height: 30, borderRadius: radius.full }} />
          ) : null}
          <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>
            {convo.title}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Conversation options" onPress={() => setMenuOpen(true)} hitSlop={8}>
          <MoreHorizontal color={colors.text} size={24} />
        </Pressable>
      </View>

      {/* Messages (inverted) */}
      <FlatList
        data={data}
        inverted
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[1] }}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            mine={item.sender_id === me?.user_id}
            isGroup={isGroup}
            onRetry={(m) => doSend(m.content_plain, m)}
          />
        )}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (messages.hasNextPage && !messages.isFetchingNextPage) messages.fetchNextPage();
        }}
        ListFooterComponent={
          messages.isFetchingNextPage ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing[4] }} />
          ) : null
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: spacing[12], alignItems: 'center', transform: [{ scaleY: -1 }] }}>
            <Text style={{ color: colors.textMuted, fontSize: typography.size.base }}>No messages yet. Say hello.</Text>
          </View>
        }
      />

      {/* Composer / read-only banner */}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: insets.bottom }}>
        <MessageComposer
          value={text}
          onChangeText={setText}
          onSend={handleSend}
          sending={sendMsg.isPending}
          left={left}
          blocked={blocked}
        />
      </View>

      {/* Kebab action menu */}
      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setMenuOpen(false)} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing[4], gap: spacing[1], paddingBottom: insets.bottom + spacing[4] }}>
          <MenuRow
            label={convo.is_muted ? 'Unmute' : 'Mute'}
            onPress={() => {
              muteM.mutate({ id: conversationId, muted: !convo.is_muted });
              setMenuOpen(false);
            }}
          />
          <MenuRow
            label={convo.is_archived ? 'Unarchive' : 'Archive'}
            onPress={() => {
              archiveM.mutate({ id: conversationId, archived: !convo.is_archived });
              setMenuOpen(false);
            }}
          />
          {!left ? (
            <MenuRow
              label="Leave conversation"
              danger
              onPress={() => {
                leaveM.mutate(conversationId, { onSuccess: () => router.back() });
                setMenuOpen(false);
              }}
            />
          ) : null}
          {convo.type === 'direct' ? (
            <MenuRow
              label={blocked ? 'Unblock' : 'Block'}
              danger={!blocked}
              onPress={() => {
                blockM.mutate({ id: conversationId, blocked: !blocked });
                setMenuOpen(false);
              }}
            />
          ) : null}
          <MenuRow label="Cancel" onPress={() => setMenuOpen(false)} />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function MenuRow({ label, danger, onPress }: { label: string; danger?: boolean; onPress: () => void }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ paddingVertical: spacing[3] }}>
      <Text style={{ color: danger ? colors.danger : colors.text, fontSize: typography.size.base }}>{label}</Text>
    </Pressable>
  );
}
