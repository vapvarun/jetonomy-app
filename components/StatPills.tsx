// components/StatPills.tsx — reputation / post / reply count pills.
// Tapping the reputation pill routes to the leaderboard.

import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeContext';

export interface StatPillsProps {
  reputation: number;
  postCount: number;
  replyCount: number;
  /** Disable the rep→leaderboard tap (e.g. when already on leaderboard). */
  linkReputation?: boolean;
}

export default function StatPills({
  reputation,
  postCount,
  replyCount,
  linkReputation = true,
}: StatPillsProps) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pill
        label="Reputation"
        value={reputation}
        onPress={linkReputation ? () => router.push('/leaderboard') : undefined}
      />
      <Pill label="Posts" value={postCount} />
      <Pill label="Replies" value={replyCount} />
    </View>
  );
}

function Pill({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress?: () => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.bgSubtle,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1],
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.semibold as '600',
        }}
      >
        {value}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
        {label}
      </Text>
    </View>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}. View leaderboard`}
        onPress={onPress}
        hitSlop={6}
      >
        {body}
      </Pressable>
    );
  }
  return body;
}
