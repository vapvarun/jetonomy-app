// app/(tabs)/profile.tsx — Profile placeholder + working sign-out. The Profile
// domain (04) fills the full profile + the entry into app/manage/* (admin).

import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';

export default function ProfileScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useCurrentUser();
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top + spacing[6],
        paddingHorizontal: spacing[6],
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: typography.size['2xl'],
          fontWeight: typography.weight.bold as '700',
        }}
      >
        {me?.display_name ?? 'Profile'}
      </Text>
      {me ? (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.size.base,
            marginTop: spacing[2],
          }}
        >
          {me.trust_level_name} · {me.reputation} rep · {me.post_count} posts
        </Text>
      ) : null}

      <Pressable
        onPress={() => {
          void signOut();
        }}
        style={{
          marginTop: spacing[8],
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingVertical: spacing[3],
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: colors.danger,
            fontSize: typography.size.base,
            fontWeight: typography.weight.semibold as '600',
          }}
        >
          Sign out
        </Text>
      </Pressable>
    </View>
  );
}
