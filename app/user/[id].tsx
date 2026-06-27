// app/user/[id].tsx — read-only public profile of another member.
// Param is either a numeric user id (from leaderboard / notification deep-links)
// or a @handle (login). Pro badges/fields sections self-gate and render null
// when the feature flag is off.

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import PostCard, { PostCardSkeleton } from '@/components/PostCard';
import UserHeader from '@/components/UserHeader';
import BadgeList from '@/components/BadgeList';
import CustomFieldList from '@/components/CustomFieldList';
import {
  useUser,
  useUserByLogin,
  useUserPosts,
  useUserBadges,
  useUserFields,
} from '@/hooks/useProfile';
import { useTheme } from '@/theme/ThemeContext';
import type { ApiError } from '@/api/client';

export default function UserProfileScreen() {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: rawParam } = useLocalSearchParams<{ id: string }>();
  const param = Array.isArray(rawParam) ? rawParam[0] : rawParam;
  const numericId = param && /^\d+$/.test(param) ? Number(param) : null;
  const login = numericId == null && param ? param.replace(/^@/, '') : null;

  const byId = useUser(numericId);
  const byLogin = useUserByLogin(login);
  const profileQuery = numericId != null ? byId : byLogin;
  const user = profileQuery.data ?? null;
  const userId = numericId ?? user?.id ?? null;

  const posts = useUserPosts(userId);
  const badges = useUserBadges(userId);
  const fields = useUserFields(userId);

  const err = profileQuery.error as ApiError | null;
  const notFound = err?.status === 404;
  const forbidden = err?.status === 403;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[3],
          paddingBottom: spacing[2],
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={colors.text} size={24} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }} numberOfLines={1}>
          {user?.display_name ?? 'Profile'}
        </Text>
      </View>

      {profileQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : forbidden ? (
        <CenterMsg title="Profile is private" subtitle="This member limits who can view their profile." />
      ) : notFound || !user ? (
        <CenterMsg
          title="User not found"
          subtitle="This profile may have been removed."
          action={profileQuery.isError ? { label: 'Retry', onPress: () => profileQuery.refetch() } : undefined}
        />
      ) : (
        <FlatList
          data={posts.posts}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: insets.bottom + spacing[10] }}
          ListHeaderComponent={
            <View style={{ gap: spacing[4], marginBottom: spacing[2] }}>
              <UserHeader user={user} />
              <BadgeList badges={badges.data} isLoading={badges.isLoading} />
              <CustomFieldList fields={fields.data} isLoading={fields.isLoading} />
              <Text style={{ color: colors.text, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600', marginTop: spacing[2] }}>
                Posts
              </Text>
            </View>
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (posts.hasNextPage && !posts.isFetchingNextPage) posts.fetchNextPage();
          }}
          renderItem={({ item }) => <PostCard post={item} />}
          ListEmptyComponent={
            posts.isLoading ? (
              <View style={{ gap: spacing[3] }}>
                <PostCardSkeleton />
                <PostCardSkeleton />
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: spacing[8] }}>
                <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>No posts yet.</Text>
              </View>
            )
          }
          ListFooterComponent={
            posts.isFetchingNextPage ? (
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

function CenterMsg({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[2], padding: spacing[6] }}>
      <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: colors.textMuted, fontSize: typography.size.sm, textAlign: 'center' }}>{subtitle}</Text>
      ) : null}
      {action ? (
        <Pressable onPress={action.onPress} accessibilityRole="button" style={{ marginTop: spacing[2] }}>
          <Text style={{ color: colors.accent }}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
