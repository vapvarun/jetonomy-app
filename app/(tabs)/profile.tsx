// app/(tabs)/profile.tsx — own profile: header, trust/rep, Pro badges + fields,
// segmented My Posts / Bookmarks, and links to Edit Profile, Settings,
// Leaderboard, and Logout.

import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Boxes, LogOut, Pencil, Settings, Trophy } from 'lucide-react-native';

import { SITE_URL_HARDCODED } from '@/theme/branding';

import PostCard, { PostCardSkeleton } from '@/components/PostCard';
import UserHeader from '@/components/UserHeader';
import BadgeList from '@/components/BadgeList';
import CustomFieldList from '@/components/CustomFieldList';
import { useMe, useUserPosts, useUserBadges, useUserFields } from '@/hooks/useProfile';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { usePushStore } from '@/stores/pushStore';
import { useTheme } from '@/theme/ThemeContext';

type Tab = 'posts' | 'bookmarks';

export default function ProfileScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const push = usePushStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);

  const cached = useCurrentUser();
  const meQuery = useMe();
  const me = meQuery.data ?? cached;
  const meId = me?.id ?? null;

  const [tab, setTab] = useState<Tab>('posts');
  const posts = useUserPosts(tab === 'posts' ? meId : null);
  const badges = useUserBadges(meId);
  const fields = useUserFields(meId);

  if (!me) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        {meQuery.isError ? (
          <Pressable onPress={() => meQuery.refetch()} accessibilityRole="button">
            <Text style={{ color: colors.accent }}>Retry</Text>
          </Pressable>
        ) : (
          <ActivityIndicator size="large" color={colors.accent} />
        )}
      </View>
    );
  }

  const Header = (
    <View style={{ gap: spacing[4], marginBottom: spacing[2] }}>
      {/* Top action bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[4] }}>
        {!SITE_URL_HARDCODED ? (
          <IconLink label="Communities" onPress={() => router.push('/communities')} icon={<Boxes color={colors.text} size={20} />} />
        ) : null}
        <IconLink label="Leaderboard" onPress={() => router.push('/leaderboard')} icon={<Trophy color={colors.text} size={20} />} />
        <IconLink label="Edit profile" onPress={() => router.push('/edit-profile')} icon={<Pencil color={colors.text} size={20} />} />
        <IconLink label="Settings" onPress={() => router.push('/settings')} icon={<Settings color={colors.text} size={20} />} />
      </View>

      {/* TEMP push debug — remove after diagnosis */}
      <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing[3], gap: 4, backgroundColor: colors.bgSubtle }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: typography.size.sm }}>Push debug</Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
          supported: {String(push.supported)} · permission: {push.permission} · registered: {String(push.registered)}
        </Text>
        <Text selectable style={{ color: colors.text, fontSize: typography.size.xs }}>token: {push.token ?? 'null'}</Text>
      </View>

      <UserHeader user={{ ...me, user_login: undefined }} linkReputation />

      <BadgeList badges={badges.data} isLoading={badges.isLoading} />
      <CustomFieldList fields={fields.data} isLoading={fields.isLoading} />

      {/* Segmented My Posts / Bookmarks */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.bgSubtle, borderRadius: radius.md, padding: 3 }}>
        {(['posts', 'bookmarks'] as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(t)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: spacing[2],
                borderRadius: radius.sm,
                backgroundColor: active ? colors.surface : 'transparent',
              }}
            >
              <Text
                style={{
                  color: active ? colors.text : colors.textMuted,
                  fontSize: typography.size.sm,
                  fontWeight: (active ? typography.weight.semibold : typography.weight.regular) as '600' | '400',
                }}
              >
                {t === 'posts' ? 'My Posts' : 'Bookmarks'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={tab === 'posts' ? posts.posts : []}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{
          paddingTop: insets.top + spacing[4],
          paddingHorizontal: spacing[4],
          paddingBottom: insets.bottom + spacing[10],
          gap: spacing[3],
        }}
        ListHeaderComponent={Header}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (tab === 'posts' && posts.hasNextPage && !posts.isFetchingNextPage) posts.fetchNextPage();
        }}
        renderItem={({ item }) => <PostCard post={item} />}
        ListEmptyComponent={
          tab === 'bookmarks' ? (
            <BookmarksPlaceholder />
          ) : posts.isLoading ? (
            <View style={{ gap: spacing[3] }}>
              <PostCardSkeleton />
              <PostCardSkeleton />
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing[8] }}>
              <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>You haven't posted yet.</Text>
            </View>
          )
        }
        ListFooterComponent={
          tab === 'posts' && posts.isFetchingNextPage ? (
            <View style={{ paddingVertical: spacing[4] }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null
        }
      />

      {/* Logout */}
      <View
        style={{
          paddingHorizontal: spacing[4],
          paddingBottom: insets.bottom + spacing[3],
          paddingTop: spacing[2],
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={() => {
            void signOut();
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[2],
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingVertical: spacing[3],
          }}
        >
          <LogOut color={colors.danger} size={18} />
          <Text style={{ color: colors.danger, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>
            Sign out
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function IconLink({ label, icon, onPress }: { label: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}>
      {icon}
    </Pressable>
  );
}

/**
 * Bookmarks tab placeholder. Bookmarks are owned by the Spaces+Personal domain
 * (03) via its `api/bookmarks` (GET /bookmarks); this domain (04) must NOT
 * re-implement it. Until 03 ships its `useBookmarks` hook, the tab shows an
 * empty state. Wiring is a one-line swap when that module lands.
 */
function BookmarksPlaceholder() {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing[8], gap: spacing[2] }}>
      <Text style={{ color: colors.text, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>
        No bookmarks yet
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: typography.size.sm, textAlign: 'center' }}>
        Posts you bookmark will show up here.
      </Text>
    </View>
  );
}
