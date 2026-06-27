// components/UserHeader.tsx — avatar + name + handle + trust + stats block.
// Shared by profile.tsx (own) and user/[id].tsx (public). Accepts the common
// subset of Me / PublicUser fields so a single component serves both.

import { Image, Text, View } from 'react-native';

import StatPills from '@/components/StatPills';
import TrustLevelBadge from '@/components/TrustLevelBadge';
import { useTheme } from '@/theme/ThemeContext';

export interface UserHeaderUser {
  display_name: string;
  user_login?: string;
  avatar_url: string | null;
  bio: string | null;
  trust_level: number;
  trust_level_name: string;
  reputation: number;
  post_count: number;
  reply_count: number;
}

export interface UserHeaderProps {
  user: UserHeaderUser;
  /** Disable rep→leaderboard link (e.g. already navigating elsewhere). */
  linkReputation?: boolean;
}

export default function UserHeader({ user, linkReputation }: UserHeaderProps) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View style={{ gap: spacing[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        {user.avatar_url ? (
          <Image
            source={{ uri: user.avatar_url }}
            style={{ width: 64, height: 64, borderRadius: radius.full }}
          />
        ) : (
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.full,
              backgroundColor: colors.bgSubtle,
            }}
          />
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.size.xl,
              fontWeight: typography.weight.bold as '700',
            }}
            numberOfLines={1}
          >
            {user.display_name}
          </Text>
          {user.user_login ? (
            <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }} numberOfLines={1}>
              @{user.user_login}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row' }}>
            <TrustLevelBadge level={user.trust_level} name={user.trust_level_name} />
          </View>
        </View>
      </View>

      {user.bio ? (
        <Text style={{ color: colors.text, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm }}>
          {user.bio}
        </Text>
      ) : null}

      <StatPills
        reputation={user.reputation}
        postCount={user.post_count}
        replyCount={user.reply_count}
        linkReputation={linkReputation}
      />
    </View>
  );
}
