// app/(tabs)/index.tsx — Home feed. GET /feed with graceful fallback to a
// space-scoped list (handled inside getFeed). Sort Hot/New/Top → server
// popular/latest/popular (no all-time top sort exists for space lists).

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';

import PostCard, { PostCardSkeleton } from '@/components/PostCard';
import { useFeed } from '@/hooks/usePosts';
import type { FeedSort } from '@/api/posts';
import { useTheme } from '@/theme/ThemeContext';

type SortKey = 'hot' | 'new' | 'top';

const SORTS: { key: SortKey; label: string; server: FeedSort }[] = [
  { key: 'hot', label: 'Hot', server: 'hot' },
  { key: 'new', label: 'New', server: 'new' },
  { key: 'top', label: 'Top', server: 'top' },
];

export default function HomeScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [sortKey, setSortKey] = useState<SortKey>('hot');
  const serverSort = useMemo(
    () => SORTS.find((s) => s.key === sortKey)?.server ?? 'hot',
    [sortKey]
  );

  const {
    posts,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    fallbackSpaceId,
  } = useFeed(serverSort);

  const composeHref = fallbackSpaceId != null ? `/post/new?spaceId=${fallbackSpaceId}` : '/post/new';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing[3],
          paddingHorizontal: spacing[4],
          paddingBottom: spacing[3],
          gap: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Text style={{ color: colors.text, fontSize: typography.size['2xl'], fontWeight: typography.weight.bold as '700' }}>
          Home
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          {SORTS.map((s) => {
            const active = s.key === sortKey;
            return (
              <Pressable
                key={s.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSortKey(s.key)}
                style={{
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[1],
                  borderRadius: radius.full,
                  backgroundColor: active ? colors.accent : colors.bgSubtle,
                  borderWidth: 1,
                  borderColor: active ? colors.accent : colors.border,
                }}
              >
                <Text
                  style={{
                    color: active ? colors.accentFg : colors.textMuted,
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.medium as '500',
                  }}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing[4], gap: spacing[3] }}>
          {[0, 1, 2, 3].map((i) => (
            <PostCardSkeleton key={`sk-${i}`} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState
          message={error?.message ?? 'Could not load the feed.'}
          onRetry={() => refetch()}
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => <PostCard post={item} />}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: insets.bottom + spacing[12] }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accent} />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: spacing[12], gap: spacing[3] }}>
              <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>
                No posts yet
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.size.base, textAlign: 'center' }}>
                Be the first to start a conversation.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(composeHref)}
                style={{ backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing[5], paddingVertical: spacing[3] }}
              >
                <Text style={{ color: colors.accentFg, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>
                  Create a post
                </Text>
              </Pressable>
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

      {/* Compose FAB */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create post"
        onPress={() => router.push(composeHref)}
        style={{
          position: 'absolute',
          right: spacing[5],
          bottom: insets.bottom + spacing[5],
          width: 56,
          height: 56,
          borderRadius: radius.full,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <Plus color={colors.accentFg} size={26} />
      </Pressable>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6], gap: spacing[3] }}>
      <Text style={{ color: colors.text, fontSize: typography.size.base, textAlign: 'center' }}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={{ borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[5], paddingVertical: spacing[3] }}
      >
        <Text style={{ color: colors.accent, fontSize: typography.size.base }}>Retry</Text>
      </Pressable>
    </View>
  );
}
