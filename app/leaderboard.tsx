// app/leaderboard.tsx — ranked members. Lives OUTSIDE the (tabs) group on
// purpose: the bottom-tab shell is locked to 5 tabs (foundation), so adding a
// (tabs) file would inject an unwanted 6th tab. Reached from Profile + the
// reputation StatPill. Period segmented control + infinite scroll.

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
import { ArrowLeft } from 'lucide-react-native';

import LeaderboardRow from '@/components/LeaderboardRow';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useCurrentUser } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import type { LeaderboardPeriod } from '@/types/leaderboard';

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'month', label: 'Month' },
  { key: 'week', label: 'Week' },
];

export default function LeaderboardScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useCurrentUser();

  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const {
    rows,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLeaderboard(period);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[3],
          paddingBottom: spacing[3],
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: spacing[3],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft color={colors.text} size={24} />
          </Pressable>
          <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>
            Leaderboard
          </Text>
        </View>

        {/* Segmented control */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.bgSubtle,
            borderRadius: radius.md,
            padding: 3,
          }}
        >
          {PERIODS.map((p) => {
            const active = period === p.key;
            return (
              <Pressable
                key={p.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setPeriod(p.key)}
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
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing[4], gap: spacing[3] }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={`sk-${i}`} style={{ height: 64, borderRadius: radius.md, backgroundColor: colors.bgSubtle }} />
          ))}
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
          <Text style={{ color: colors.text }}>Could not load the leaderboard.</Text>
          <Pressable onPress={() => refetch()} accessibilityRole="button">
            <Text style={{ color: colors.accent }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.user_id)}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[2], paddingBottom: insets.bottom + spacing[10] }}
          refreshing={isRefetching}
          onRefresh={refetch}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          renderItem={({ item }) => (
            <LeaderboardRow row={item} isCurrentUser={me?.id === item.user_id} />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: spacing[12] }}>
              <Text style={{ color: colors.textMuted, fontSize: typography.size.base }}>
                No ranked members yet.
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
