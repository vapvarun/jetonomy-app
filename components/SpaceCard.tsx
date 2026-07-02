// components/SpaceCard.tsx — discovery/list row for a Space.

import { Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, MessageSquare, Users } from 'lucide-react-native';

import SpaceIcon from '@/components/SpaceIcon';
import { useTheme } from '@/theme/ThemeContext';
import { relativeTime } from '@/utils/date';
import type { Space } from '@/types/space';

export interface SpaceCardProps {
  space: Space;
}

export default function SpaceCard({ space }: SpaceCardProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();

  const active = relativeTime(space.last_activity_at);
  const isRestricted = space.visibility === 'private' || space.visibility === 'hidden';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${space.title}`}
      onPress={() => router.push(`/space/${space.id}`)}
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing[4],
        gap: spacing[2],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        {space.cover_image ? (
          <Image
            source={{ uri: space.cover_image }}
            style={{ width: 40, height: 40, borderRadius: radius.md }}
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              backgroundColor: colors.bgSubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SpaceIcon icon={space.icon} size={22} color={colors.accent} />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <Text
              numberOfLines={1}
              style={{
                flexShrink: 1,
                color: colors.text,
                fontSize: typography.size.base,
                fontWeight: typography.weight.semibold as '600',
              }}
            >
              {space.title}
            </Text>
            {isRestricted ? <Lock color={colors.textMuted} size={14} /> : null}
          </View>
          {space.description ? (
            <Text
              numberOfLines={1}
              style={{ color: colors.textMuted, fontSize: typography.size.sm }}
            >
              {space.description}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
        <Stat icon={<Users color={colors.textMuted} size={14} />} value={space.member_count} colors={colors} />
        <Stat icon={<MessageSquare color={colors.textMuted} size={14} />} value={space.post_count} colors={colors} />
        <View style={{ flex: 1 }} />
        {active ? (
          <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
            Active {active}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function Stat({
  icon,
  value,
  colors,
}: {
  icon: React.ReactNode;
  value: number;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {icon}
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{value}</Text>
    </View>
  );
}

/** Loading skeleton matching SpaceCard height. */
export function SpaceCardSkeleton() {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing[4],
        gap: spacing[2],
      }}
    >
      <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.bgSubtle }} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ height: 14, width: '50%', backgroundColor: colors.bgSubtle, borderRadius: radius.sm }} />
          <View style={{ height: 12, width: '70%', backgroundColor: colors.bgSubtle, borderRadius: radius.sm }} />
        </View>
      </View>
    </View>
  );
}
