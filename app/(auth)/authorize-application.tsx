// app/(auth)/authorize-application.tsx — PHASE-2 STUB (documented, not built).
//
// Phase 2 replaces the manual App-Password paste on the login screen with a
// tap-to-approve WebView onto:
//   ${siteUrl}/wp-admin/authorize-application.php?app_name=Jetonomy
//     &success_url=jetonomyapp://auth-callback
// On the success_url redirect WP appends ?site_url=&user_login=&password=;
// intercept it, parse the App Password, and call authStore.signIn(). The
// jetonomyapp:// scheme is registered in app.json. Phase 1 ships the manual
// paste flow on login.tsx; this file only reserves the route.

import { View, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

export default function AuthorizeApplicationScreen() {
  const { colors, spacing, typography } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
        padding: spacing[6],
      }}
    >
      <Text
        style={{
          color: colors.textMuted,
          fontSize: typography.size.base,
          textAlign: 'center',
        }}
      >
        Tap-to-approve sign in arrives in a later release. For now, paste an
        Application Password on the login screen.
      </Text>
    </View>
  );
}
