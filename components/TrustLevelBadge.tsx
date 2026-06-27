// components/TrustLevelBadge.tsx — colored chip for a member's trust level.
// Maps trust_level (0–5) → a token-derived color so it stays dark-mode safe.

import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

export interface TrustLevelBadgeProps {
  level: number;
  name?: string;
  /** Compact = no label, dot only. */
  compact?: boolean;
}

/** Trust 0–5 hues (mirrors plugin --jt-tl0..5 intent), tinted per scheme. */
const TL_HUE = ['#94A3B8', '#0EA5E9', '#22C55E', '#A855F7', '#F59E0B', '#EF4444'];

export default function TrustLevelBadge({ level, name, compact }: TrustLevelBadgeProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const hue = TL_HUE[Math.max(0, Math.min(5, level))] ?? TL_HUE[0];
  const label = name || `Level ${level}`;

  if (compact) {
    return (
      <View
        accessibilityLabel={label}
        style={{ width: 10, height: 10, borderRadius: radius.full, backgroundColor: hue }}
      />
    );
  }

  return (
    <View
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: hue,
        backgroundColor: colors.bgSubtle,
        paddingHorizontal: spacing[2],
        paddingVertical: 2,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: hue }} />
      <Text
        style={{
          color: colors.text,
          fontSize: typography.size.xs,
          fontWeight: typography.weight.medium as '500',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
