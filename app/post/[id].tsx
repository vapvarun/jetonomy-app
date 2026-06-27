// app/post/[id].tsx — thread detail: post header + votes + mod actions +
// reaction/poll seams + threaded replies + sticky reply composer +
// "N new replies" banner.

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  MoreHorizontal,
  Pin,
} from 'lucide-react-native';

import ContentBody from '@/components/ContentBody';
import VoteButton from '@/components/VoteButton';
import ReactionBar from '@/components/ReactionBar';
import PollView from '@/components/PollView';
import FlagButton from '@/components/FlagButton';
import ReplyItem from '@/components/ReplyItem';
import Composer from '@/components/Composer';
import {
  usePost,
  useClosePost,
  useDeletePost,
  useMergePost,
  useMovePost,
  usePinPost,
  useSetIdeaStatus,
} from '@/hooks/usePosts';
import {
  useReplies,
  useCreateReply,
  useUpdateReply,
  useDeleteReply,
  useAcceptReply,
  useUnacceptReply,
} from '@/hooks/useReplies';
import { useNewReplies, newReplyCount } from '@/hooks/useUpdates';
import { listSpacesLite } from '@/api/posts';
import { useCurrentUser } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import type { ReplySort } from '@/api/replies';
import type { IdeaStatus, Post } from '@/types/post';
import type { Reply } from '@/types/reply';

function canModerate(me: ReturnType<typeof useCurrentUser>): boolean {
  if (!me) return false;
  const v = me as Record<string, unknown>;
  return Boolean(v.can_moderate || v.is_moderator || v.is_admin);
}

const IDEA_STATUSES: IdeaStatus[] = ['planned', 'in_progress', 'shipped', 'declined'];
const REPLY_SORTS: { key: ReplySort; label: string }[] = [
  { key: 'oldest', label: 'Oldest' },
  { key: 'newest', label: 'Newest' },
  { key: 'best', label: 'Best' },
];

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useCurrentUser();

  const [sort, setSort] = useState<ReplySort>('oldest');
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [modSheet, setModSheet] = useState(false);
  const [sinceSeen, setSinceSeen] = useState<string>(() => new Date().toISOString());

  const postQ = usePost(postId);
  const repliesQ = useReplies(postId, sort);

  const post = postQ.data;
  const createReply = useCreateReply(postId, sort);
  const updateReply = useUpdateReply(postId);
  const deleteReply = useDeleteReply(postId);
  const acceptReply = useAcceptReply(postId);
  const unacceptReply = useUnacceptReply(postId);

  const newRepliesQ = useNewReplies(postId, sinceSeen, !!post && !post.is_closed);
  const newCount = newReplyCount(newRepliesQ.data);

  const isQa = post?.type === 'question';
  const isModerator = canModerate(me);
  const isAuthor = !!me && post?.author_id === me.user_id;
  const canAccept = isQa && (isAuthor || isModerator);

  // depth map for threading
  const depthOf = useMemo(() => {
    const map = new Map<number, Reply>();
    repliesQ.replies.forEach((r) => map.set(r.id, r));
    const cache = new Map<number, number>();
    const compute = (r: Reply): number => {
      if (cache.has(r.id)) return cache.get(r.id) as number;
      let depth = 0;
      let cur: Reply | undefined = r;
      const seen = new Set<number>();
      while (cur?.parent_id != null && map.has(cur.parent_id) && !seen.has(cur.id)) {
        seen.add(cur.id);
        depth += 1;
        cur = map.get(cur.parent_id);
      }
      cache.set(r.id, depth);
      return depth;
    };
    const out = new Map<number, number>();
    repliesQ.replies.forEach((r) => out.set(r.id, compute(r)));
    return out;
  }, [repliesQ.replies]);

  function handleSubmitReply() {
    if (!replyText.trim()) return;
    setReplyError(null);
    if (editingReplyId != null) {
      updateReply.mutate(
        { id: editingReplyId, body: { content: replyText.trim() } },
        {
          onSuccess: () => {
            setReplyText('');
            setEditingReplyId(null);
          },
          onError: (e) => setReplyError(e.message),
        }
      );
      return;
    }
    createReply.mutate(
      { content: replyText.trim() },
      {
        onSuccess: () => setReplyText(''),
        onError: (e) => setReplyError(e.message),
      }
    );
  }

  function handleQuote(reply: Reply) {
    const quoted = reply.content_plain
      .split('\n')
      .map((l) => `> ${l}`)
      .join('\n');
    setReplyText((prev) => `${quoted}\n\n${prev}`);
  }

  function handleEditReply(reply: Reply) {
    setEditingReplyId(reply.id);
    setReplyText(reply.content_plain);
  }

  // ---- Loading / error states ----
  if (postQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }
  if (postQ.isError || !post) {
    const status = (postQ.error as { status?: number } | null)?.status;
    const msg =
      status === 404 ? 'Thread not found.' : status === 403 ? 'This thread is private.' : 'Could not load this thread.';
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[6] }}>
        <Text style={{ color: colors.text, fontSize: typography.size.lg }}>{msg}</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={{ paddingVertical: spacing[2], paddingHorizontal: spacing[4] }}>
          <Text style={{ color: colors.accent }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const Header = (
    <View style={{ gap: spacing[3], paddingBottom: spacing[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] }}>
        <VoteButton kind="post" id={post.id} score={post.vote_score} userValue={post.viewer_vote ?? 0} />
        <View style={{ flex: 1, gap: spacing[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' }}>
            {post.is_sticky ? <Pin color={colors.accent} size={16} /> : null}
            {post.is_closed ? <Lock color={colors.textMuted} size={16} /> : null}
            {post.is_resolved ? <CheckCircle2 color={colors.success} size={16} /> : null}
            {post.prefix ? (
              <View style={{ backgroundColor: post.prefix_color || colors.bgSubtle, borderRadius: radius.sm, paddingHorizontal: spacing[2], paddingVertical: 2 }}>
                <Text style={{ color: colors.accentFg, fontSize: typography.size.xs }}>{post.prefix}</Text>
              </View>
            ) : null}
          </View>
          {post.title ? (
            <Text style={{ color: colors.text, fontSize: typography.size.xl, fontWeight: typography.weight.bold as '700' }}>
              {post.title}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            {post.author_avatar ? (
              <Image source={{ uri: post.author_avatar }} style={{ width: 22, height: 22, borderRadius: radius.full }} />
            ) : null}
            <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
              {post.author_name} · {post.time_ago} · {post.space_title}
            </Text>
          </View>
        </View>
      </View>

      <ContentBody html={post.content} />

      {/* Pro seams (null unless feature on) */}
      <ReactionBar target={{ kind: 'post', id: post.id }} seed={post.reactions as never} />
      <PollView postId={post.id} seed={post.poll as never} />

      {/* Member report action (server-gated: 403 hides it). */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <FlagButton target={{ kind: 'post', id: post.id }} />
      </View>

      {/* Reply sort */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2] }}>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
          {post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}
        </Text>
        <View style={{ flex: 1 }} />
        {REPLY_SORTS.map((s) => {
          const active = s.key === sort;
          return (
            <Pressable
              key={s.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setSort(s.key)}
              style={{ paddingHorizontal: spacing[2], paddingVertical: spacing[1] }}
            >
              <Text style={{ color: active ? colors.accent : colors.textMuted, fontSize: typography.size.sm, fontWeight: active ? (typography.weight.semibold as '600') : (typography.weight.regular as '400') }}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {newCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            repliesQ.refetch();
            setSinceSeen(new Date().toISOString());
          }}
          style={{ backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing[2], alignItems: 'center' }}
        >
          <Text style={{ color: colors.accentFg, fontSize: typography.size.sm, fontWeight: typography.weight.semibold as '600' }}>
            {newCount} new {newCount === 1 ? 'reply' : 'replies'} — tap to load
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

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
        <View style={{ flex: 1 }} />
        {isAuthor || isModerator ? (
          <Pressable accessibilityRole="button" accessibilityLabel="More actions" onPress={() => setModSheet(true)} hitSlop={8}>
            <MoreHorizontal color={colors.text} size={24} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={repliesQ.replies}
        keyExtractor={(r) => String(r.id)}
        ListHeaderComponent={Header}
        renderItem={({ item }) => (
          <ReplyItem
            reply={item}
            depth={depthOf.get(item.id) ?? 0}
            isQa={isQa}
            canAccept={canAccept}
            canManage={isModerator || (!!me && item.author_id === me.user_id)}
            onQuote={handleQuote}
            onAccept={(rid) => acceptReply.mutate(rid)}
            onUnaccept={(rid) => unacceptReply.mutate(rid)}
            onEdit={handleEditReply}
            onDelete={(rid) => deleteReply.mutate(rid)}
          />
        )}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[6] }}
        ListEmptyComponent={
          <View style={{ paddingVertical: spacing[8], alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: typography.size.base }}>No replies yet. Start the conversation.</Text>
          </View>
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (repliesQ.hasNextPage && !repliesQ.isFetchingNextPage) repliesQ.fetchNextPage();
        }}
        ListFooterComponent={repliesQ.isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing[4] }} /> : null}
      />

      {/* Reply composer */}
      {post.is_closed ? (
        <View style={{ padding: spacing[4], borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
          <Text style={{ color: colors.textMuted, fontSize: typography.size.sm, textAlign: 'center' }}>This thread is closed.</Text>
        </View>
      ) : (
        <View style={{ padding: spacing[3], paddingBottom: insets.bottom + spacing[2], borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
          {editingReplyId != null ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setEditingReplyId(null);
                setReplyText('');
              }}
              style={{ paddingBottom: spacing[2] }}
            >
              <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>Editing reply — tap to cancel</Text>
            </Pressable>
          ) : null}
          <Composer
            value={replyText}
            onChangeText={setReplyText}
            onSubmit={handleSubmitReply}
            submitting={createReply.isPending || updateReply.isPending}
            submitLabel={editingReplyId != null ? 'Save' : 'Reply'}
            placeholder="Write a reply…"
            error={replyError}
            spaceId={post.space_id}
            minHeight={72}
          />
        </View>
      )}

      <ModSheet
        visible={modSheet}
        onClose={() => setModSheet(false)}
        post={post}
        isModerator={isModerator}
        isAuthor={isAuthor}
        onDeleted={() => {
          setModSheet(false);
          router.back();
        }}
      />
    </KeyboardAvoidingView>
  );
}

// ---- Moderation / author action sheet -------------------------------------

function ModSheet({
  visible,
  onClose,
  post,
  isModerator,
  isAuthor,
  onDeleted,
}: {
  visible: boolean;
  onClose: () => void;
  post: Post;
  isModerator: boolean;
  isAuthor: boolean;
  onDeleted: () => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const pin = usePinPost(post.id);
  const close = useClosePost(post.id);
  const ideaStatus = useSetIdeaStatus(post.id);
  const move = useMovePost(post.id);
  const merge = useMergePost(post.id);
  const del = useDeletePost(post.id, post.space_id);

  const [mode, setMode] = useState<'menu' | 'move' | 'merge'>('menu');
  const [spaces, setSpaces] = useState<{ id: number; title: string }[]>([]);
  const [mergeId, setMergeId] = useState('');

  async function openMove() {
    setMode('move');
    try {
      const list = await listSpacesLite();
      setSpaces(list.map((s) => ({ id: s.id, title: s.title })));
    } catch {
      setSpaces([]);
    }
  }

  const Row = ({ label, danger, onPress }: { label: string; danger?: boolean; onPress: () => void }) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ paddingVertical: spacing[3] }}>
      <Text style={{ color: danger ? colors.danger : colors.text, fontSize: typography.size.base }}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing[4], gap: spacing[1] }}>
        {mode === 'menu' ? (
          <>
            {isModerator ? (
              <>
                <Row label={post.is_sticky ? 'Unpin' : 'Pin'} onPress={() => pin.mutate()} />
                <Row label={post.is_closed ? 'Reopen' : 'Close'} onPress={() => close.mutate()} />
                <Row label="Move to space…" onPress={openMove} />
                <Row label="Merge into…" onPress={() => setMode('merge')} />
              </>
            ) : null}
            {post.type === 'idea' && isModerator
              ? IDEA_STATUSES.map((s) => (
                  <Row key={s} label={`Mark idea: ${s.replace('_', ' ')}`} onPress={() => ideaStatus.mutate(s)} />
                ))
              : null}
            {isAuthor || isModerator ? (
              <Row label="Edit" onPress={() => { onClose(); router.push(`/post/edit/${post.id}`); }} />
            ) : null}
            {isAuthor || isModerator ? (
              <Row label="Delete" danger onPress={() => del.mutate(undefined, { onSuccess: onDeleted })} />
            ) : null}
            <Row label="Cancel" onPress={onClose} />
          </>
        ) : mode === 'move' ? (
          <View style={{ gap: spacing[1], maxHeight: 360 }}>
            <Text style={{ color: colors.textMuted, fontSize: typography.size.sm, paddingVertical: spacing[2] }}>Move to which space?</Text>
            <FlatList
              data={spaces.filter((s) => s.id !== post.space_id)}
              keyExtractor={(s) => String(s.id)}
              renderItem={({ item }) => (
                <Row label={item.title} onPress={() => move.mutate(item.id, { onSuccess: () => { setMode('menu'); onClose(); } })} />
              )}
              ListEmptyComponent={<Text style={{ color: colors.textMuted, paddingVertical: spacing[3] }}>No other spaces.</Text>}
            />
            <Row label="Back" onPress={() => setMode('menu')} />
          </View>
        ) : (
          <View style={{ gap: spacing[2] }}>
            <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>Merge this thread into another post (enter target post id):</Text>
            <TextInput
              value={mergeId}
              onChangeText={setMergeId}
              keyboardType="number-pad"
              placeholder="123"
              placeholderTextColor={colors.textMuted}
              style={{ backgroundColor: colors.bgSubtle, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing[3], color: colors.text }}
            />
            <Pressable
              accessibilityRole="button"
              disabled={!mergeId.trim()}
              onPress={() => {
                const target = Number(mergeId.trim());
                if (!target) return;
                merge.mutate(target, { onSuccess: () => { setMode('menu'); onClose(); router.replace(`/post/${target}`); } });
              }}
              style={{ backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing[3], alignItems: 'center', opacity: mergeId.trim() ? 1 : 0.5 }}
            >
              <Text style={{ color: colors.accentFg, fontWeight: typography.weight.semibold as '600' }}>Merge</Text>
            </Pressable>
            <Row label="Back" onPress={() => setMode('menu')} />
          </View>
        )}
      </View>
    </Modal>
  );
}
