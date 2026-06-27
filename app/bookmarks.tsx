// app/bookmarks.tsx — the member's bookmarked posts (lean rows → tap to open
// the full post). BookmarkButton per row does an optimistic remove.

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageSquare } from 'lucide-react-native';

import BookmarkButton from '@/components/BookmarkButton';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useIsAuthed } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import { relativeTime } from '@/utils/date';
import type { BookmarkItem } from '@/types/bookmark';

export default function BookmarksScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authed = useIsAuthed();

  const {
    bookmarks,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBookmarks();

  const isAuthErr = (error as { status?: number } | null)?.status === 401;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
        <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>Bookmarks</Text>
      </View>

      {!authed || isAuthErr ? (
        <CenterState title="Log in to view bookmarks" />
      ) : isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
          <Text style={{ color: colors.text }}>Could not load bookmarks.</Text>
          <Pressable accessibilityRole="button" onPress={() => refetch()}>
            <Text style={{ color: colors.accent }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(b) => String(b.id)}
          renderItem={({ item }) => <BookmarkRow item={item} />}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: insets.bottom + spacing[8] }}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: spacing[12], gap: spacing[2] }}>
              <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>No bookmarks</Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.size.base, textAlign: 'center' }}>
                Save posts to find them here later.
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: spacing[4] }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function BookmarkRow({ item }: { item: BookmarkItem }) {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const ago = relativeTime(item.bookmarked_at ?? item.created_at);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title || 'Open post'}
      onPress={() => router.push(`/post/${item.id}`)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing[4],
      }}
    >
      <View style={{ flex: 1, gap: spacing[1] }}>
        <Text numberOfLines={2} style={{ color: colors.text, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>
          {item.title || 'Untitled'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MessageSquare color={colors.textMuted} size={13} />
            <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>{item.reply_count}</Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>▲ {item.vote_score}</Text>
          {ago ? <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>· {ago}</Text> : null}
        </View>
      </View>
      <BookmarkButton postId={item.id} bookmarked />
    </Pressable>
  );
}

function CenterState({ title }: { title: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] }}>
      <Text style={{ color: colors.text, fontSize: typography.size.base, textAlign: 'center' }}>{title}</Text>
    </View>
  );
}
