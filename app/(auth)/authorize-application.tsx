// app/(auth)/authorize-application.tsx — standalone WP Application Passwords
// "authorize" connect screen.
//
// The login screen (app/(auth)/login.tsx) is the primary entry to this flow;
// this route is a reachable, self-contained version that runs the same
// utils/appPasswordAuth.connectWithAppPassword() helper. It takes the target
// site from the `?site=` param, falling back to the active session's site URL.
// On approval it validates the granted App Password (core wp/v2/users/me) and
// stores it through authStore.signIn — no JWT, no nonces.

import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { login } from '@/api/auth';
import { toApiError } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import { SITE_URL, SITE_URL_HARDCODED } from '@/theme/branding';
import { connectWithAppPassword } from '@/utils/appPasswordAuth';

export default function AuthorizeApplicationScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const params = useLocalSearchParams<{ site?: string }>();
  const signIn = useAuthStore((s) => s.signIn);
  const activeSiteUrl = useAuthStore((s) => s.activeSiteUrl);

  const targetSite = (
    params.site ||
    activeSiteUrl ||
    (SITE_URL_HARDCODED ? SITE_URL : '')
  ).replace(/\/+$/, '');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    if (!targetSite) {
      setError('No site to connect to. Open this from the login screen.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const result = await connectWithAppPassword(targetSite);
      if (result.type === 'cancel') return;
      if (result.type === 'rejected') {
        setError('Authorization was declined. You can try again.');
        return;
      }
      const { siteUrl, user, password } = result.creds;
      const me = await login(siteUrl, user, password);
      await signIn(siteUrl, user, password, me);
    } catch (e) {
      const apiErr = toApiError(e);
      setError(
        apiErr.status === 401
          ? 'Those credentials were rejected by the site.'
          : apiErr.message
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
        padding: spacing[6],
        gap: spacing[4],
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold as '700',
          textAlign: 'center',
        }}
      >
        Connect with WordPress
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: typography.size.base,
          textAlign: 'center',
        }}
      >
        {targetSite
          ? `Approve access for ${targetSite}, then come straight back — no password to copy.`
          : 'No site selected. Start from the login screen.'}
      </Text>

      {error ? (
        <Text
          style={{
            color: colors.danger,
            fontSize: typography.size.sm,
            textAlign: 'center',
          }}
        >
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={handleConnect}
        disabled={busy || !targetSite}
        style={{
          backgroundColor: colors.accent,
          borderRadius: radius.md,
          paddingVertical: spacing[4],
          paddingHorizontal: spacing[8],
          alignItems: 'center',
          alignSelf: 'stretch',
          opacity: busy || !targetSite ? 0.7 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator color={colors.accentFg} />
        ) : (
          <Text
            style={{
              color: colors.accentFg,
              fontSize: typography.size.base,
              fontWeight: typography.weight.semibold as '600',
            }}
          >
            Authorize
          </Text>
        )}
      </Pressable>
    </View>
  );
}
