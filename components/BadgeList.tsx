// components/BadgeList.tsx — earned-badge grid [PRO]. Renders null when
// features.badges is off, so parents mount it unconditionally (zero Pro imports
// up the tree). Icons are Lucide names carried on each badge.

import type { ComponentType } from 'react';
import { Text, View } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { Award } from 'lucide-react-native';

import { useFeatures } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import type { UserBadge } from '@/types/badge';

const TIER_COLOR: Record<string, string> = {
  bronze: '#B45309',
  silver: '#94A3B8',
  gold: '#F59E0B',
};

type IconComponent = ComponentType<{ color?: string; size?: number }>;

function resolveIcon(name: string): IconComponent {
  const key = name
    ? name
        .split(/[-_\s]/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join('')
    : '';
  const found = (Lucide as unknown as Record<string, IconComponent>)[key];
  return found ?? (Award as unknown as IconComponent);
}

export interface BadgeListProps {
  badges: UserBadge[] | undefined;
  isLoading?: boolean;
}

export default function BadgeList({ badges, isLoading }: BadgeListProps) {
  const { badges: enabled } = useFeatures();
  const { colors, spacing, radius, typography } = useTheme();

  if (!enabled) return null;

  // Dedupe by id — the badges endpoint can return the same badge twice (e.g.
  // earned multiple times), which would collide React keys and duplicate cells.
  const unique = badges
    ? Array.from(new Map(badges.map((b) => [b.id, b])).values())
    : [];

  return (
    <View style={{ gap: spacing[2] }}>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.size.base,
          fontWeight: typography.weight.semibold as '600',
        }}
      >
        Badges
      </Text>

      {isLoading ? (
        <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>Loading badges…</Text>
      ) : unique.length === 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>No badges yet.</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] }}>
          {unique.map((b) => {
            const Icon = resolveIcon(b.icon);
            const tint = TIER_COLOR[b.tier] ?? colors.accent;
            return (
              <View
                key={b.id}
                accessibilityLabel={`${b.name}${b.earned_at ? `, earned ${b.earned_at}` : ''}`}
                style={{ width: 72, alignItems: 'center', gap: 4 }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: radius.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.bgSubtle,
                    borderWidth: 2,
                    borderColor: tint,
                  }}
                >
                  <Icon color={tint} size={22} />
                </View>
                <Text
                  style={{ color: colors.textMuted, fontSize: typography.size.xs, textAlign: 'center' }}
                  numberOfLines={2}
                >
                  {b.name}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
