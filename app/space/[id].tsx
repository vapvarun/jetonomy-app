// app/space/[id].tsx — Space feed: header (icon/title/members/"Active N ago") +
// Join/Leave + Subscribe + post list (reuses Content PostCard). Handles the
// 403 private/hidden gate with a "request to join" state, not an error toast.

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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Lock, Plus, Users } from 'lucide-react-native';

import PostCard, { PostCardSkeleton } from '@/components/PostCard';
import JoinLeaveButton from '@/components/JoinLeaveButton';
import SubscribeToggle from '@/components/SubscribeToggle';
import { useSpace, useSpacePosts } from '@/hooks/useSpaces';
import type { PostSort } from '@/api/posts';
import { useTheme } from '@/theme/ThemeContext';
import { relativeTime } from '@/utils/date';

const SORTS: { key: PostSort; label: string }[] = [
  { key: 'latest', label: 'Latest' },
  { key: 'popular', label: 'Popular' },
  { key: 'unanswered', label: 'Unanswered' },
];

export default function SpaceFeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const spaceId = Number(id);
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [sort, setSort] = useState<PostSort>('latest');

  const spaceQ = useSpace(spaceId);
  const postsQ = useSpacePosts(spaceId, sort);

  const space = spaceQ.data;
  // 403 = private/hidden non-member gate (from either space or posts call).
  const gateError =
    (spaceQ.error as { status?: number } | null)?.status === 403 ||
    (postsQ.error as { status?: number } | null)?.status === 403;

  const active = useMemo(() => relativeTime(space?.last_activity_at), [space?.last_activity_at]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
        <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>
          {space?.title ?? 'Space'}
        </Text>
        {space ? <SubscribeToggle objectType="space" objectId={space.id} /> : null}
      </View>

      {spaceQ.isLoading ? (
        <View style={{ padding: spacing[4], gap: spacing[3] }}>
          {[0, 1, 2].map((i) => (
            <PostCardSkeleton key={`sk-${i}`} />
          ))}
        </View>
      ) : gateError ? (
        <GateState
          onBack={() => router.back()}
          title="This space is private"
          message="Request to join to see its posts."
        />
      ) : spaceQ.isError || !space ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6], gap: spacing[3] }}>
          <Text style={{ color: colors.text, textAlign: 'center' }}>
            {(spaceQ.error as { message?: string } | null)?.message ?? 'Could not load this space.'}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => spaceQ.refetch()} style={{ borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[5], paddingVertical: spacing[3] }}>
            <Text style={{ color: colors.accent }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={postsQ.posts}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => <PostCard post={item} />}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: insets.bottom + spacing[12] }}
          refreshControl={<RefreshControl refreshing={postsQ.isRefetching} onRefresh={() => postsQ.refetch()} tintColor={colors.accent} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (postsQ.hasNextPage && !postsQ.isFetchingNextPage) postsQ.fetchNextPage();
          }}
          ListHeaderComponent={
            <View style={{ gap: spacing[3], marginBottom: spacing[1] }}>
              {/* Header card */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: radius.md,
                    backgroundColor: colors.bgSubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{space.icon || '#'}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                    <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.text, fontSize: typography.size.xl, fontWeight: typography.weight.bold as '700' }}>
                      {space.title}
                    </Text>
                    {space.visibility !== 'public' ? <Lock color={colors.textMuted} size={16} /> : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                    <Users color={colors.textMuted} size={14} />
                    <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
                      {space.member_count} members
                    </Text>
                    {active ? (
                      <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>· Active {active}</Text>
                    ) : null}
                  </View>
                </View>
              </View>

              {space.description ? (
                <Text style={{ color: colors.textMuted, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm }}>
                  {space.description}
                </Text>
              ) : null}

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <JoinLeaveButton space={space} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Members"
                  onPress={() => router.push(`/space/${space.id}/members`)}
                  style={{ minHeight: 40, paddingHorizontal: spacing[4], borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: colors.text, fontSize: typography.size.sm, fontWeight: typography.weight.medium as '500' }}>Members</Text>
                </Pressable>
              </View>

              {/* Sort tabs */}
              <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                {SORTS.map((s) => {
                  const sel = s.key === sort;
                  return (
                    <Pressable
                      key={s.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: sel }}
                      onPress={() => setSort(s.key)}
                      style={{
                        paddingHorizontal: spacing[3],
                        minHeight: 32,
                        justifyContent: 'center',
                        borderRadius: radius.full,
                        backgroundColor: sel ? colors.accent : colors.bgSubtle,
                        borderWidth: 1,
                        borderColor: sel ? colors.accent : colors.border,
                      }}
                    >
                      <Text style={{ color: sel ? colors.accentFg : colors.textMuted, fontSize: typography.size.sm, fontWeight: typography.weight.medium as '500' }}>
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          }
          ListEmptyComponent={
            postsQ.isLoading ? (
              <View style={{ gap: spacing[3] }}>
                {[0, 1].map((i) => (
                  <PostCardSkeleton key={`sk-${i}`} />
                ))}
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: spacing[10], gap: spacing[2] }}>
                <Text style={{ color: colors.text, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>No posts yet</Text>
                <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>Be the first to post here.</Text>
              </View>
            )
          }
          ListFooterComponent={
            postsQ.isFetchingNextPage ? (
              <View style={{ paddingVertical: spacing[4] }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : null
          }
        />
      )}

      {/* Compose FAB — scoped to this space */}
      {space && !gateError ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create post in this space"
          onPress={() => router.push(`/post/new?spaceId=${space.id}`)}
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
      ) : null}
    </View>
  );
}

function GateState({ title, message, onBack }: { title: string; message: string; onBack: () => void }) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6], gap: spacing[3] }}>
      <Lock color={colors.textMuted} size={40} />
      <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600', textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: typography.size.base, textAlign: 'center' }}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onBack} style={{ borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[5], paddingVertical: spacing[3] }}>
        <Text style={{ color: colors.accent }}>Go back</Text>
      </Pressable>
    </View>
  );
}
