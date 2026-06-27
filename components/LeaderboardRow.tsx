// components/LeaderboardRow.tsx — one ranked member row. #1–3 get a medal hue;
// the current user is highlighted. Tapping routes to the public profile.

import { Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import TrustLevelBadge from '@/components/TrustLevelBadge';
import { useTheme } from '@/theme/ThemeContext';
import type { LeaderRow } from '@/types/leaderboard';

export interface LeaderboardRowProps {
  row: LeaderRow;
  isCurrentUser?: boolean;
}

const MEDAL: Record<number, string> = {
  1: '#F59E0B', // gold
  2: '#94A3B8', // silver
  3: '#B45309', // bronze
};

export default function LeaderboardRow({ row, isCurrentUser }: LeaderboardRowProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const medal = MEDAL[row.rank];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Rank ${row.rank}, ${row.display_name}, ${row.reputation} reputation`}
      onPress={() => router.push(`/user/${row.user_id}`)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        backgroundColor: isCurrentUser ? colors.bgSubtle : colors.surface,
        borderColor: isCurrentUser ? colors.accent : colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing[3],
      }}
    >
      <View
        style={{
          width: 28,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: medal ?? colors.textMuted,
            fontSize: typography.size.base,
            fontWeight: typography.weight.bold as '700',
          }}
        >
          {row.rank}
        </Text>
      </View>

      {row.avatar_url ? (
        <Image
          source={{ uri: row.avatar_url }}
          style={{ width: 36, height: 36, borderRadius: radius.full }}
        />
      ) : (
        <View
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.bgSubtle }}
        />
      )}

      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.size.base,
            fontWeight: typography.weight.semibold as '600',
          }}
          numberOfLines={1}
        >
          {row.display_name}
        </Text>
        <View style={{ flexDirection: 'row' }}>
          <TrustLevelBadge level={row.trust_level} />
        </View>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={{
            color: colors.accent,
            fontSize: typography.size.base,
            fontWeight: typography.weight.bold as '700',
          }}
        >
          {row.reputation}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>rep</Text>
      </View>
    </Pressable>
  );
}
