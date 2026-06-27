// app/(tabs)/messages.tsx — Messages placeholder (Pro). Filled by the Messaging
// domain (05). The tab itself is hidden unless features.messaging (see shell).

import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeContext';

export default function MessagesScreen() {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
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
        Messages
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: typography.size.base,
          marginTop: spacing[2],
        }}
      >
        Private conversations will appear here.
      </Text>
    </View>
  );
}
