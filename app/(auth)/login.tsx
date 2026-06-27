// app/(auth)/login.tsx — site-discovery-first, multi-tenant login.
//
// Flow: enter Site URL -> verifyJetonomySite() -> collect username + Application
// Password -> authStore.signIn() (validates creds via core wp/v2/users/me).
// __DEV__ prefills forums.local; in production the field starts empty.
// White-label builds (APP_SITE.hardcoded) would hide the Site URL field — not
// wired here since the build-time constant is owned by the Laravel builder.

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { login } from '@/api/auth';
import { toApiError } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import { verifyJetonomySite, type SiteValidation } from '@/utils/apiDiscovery';

type Phase = 'site' | 'credentials';

const DEV_SITE = __DEV__ ? 'http://forums.local' : '';

export default function LoginScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const signIn = useAuthStore((s) => s.signIn);

  const [phase, setPhase] = useState<Phase>('site');
  const [siteInput, setSiteInput] = useState(DEV_SITE);
  const [site, setSite] = useState<SiteValidation | null>(null);
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerifySite() {
    setError(null);
    setBusy(true);
    try {
      const result = await verifyJetonomySite(siteInput);
      if (!result.ok) {
        setError(result.message ?? "This site isn't running Jetonomy.");
        return;
      }
      setSite(result);
      setPhase('credentials');
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignIn() {
    if (!site) return;
    setError(null);
    setBusy(true);
    try {
      const me = await login(site.siteUrl, username.trim(), appPassword.trim());
      await signIn(site.siteUrl, username.trim(), appPassword.trim(), me);
      // Root layout's auth gate routes to the tabs on status === 'authed'.
    } catch (e) {
      const apiErr = toApiError(e);
      if (apiErr.status === 401) {
        setError('Wrong username or application password.');
      } else {
        setError(apiErr.message);
      }
    } finally {
      setBusy(false);
    }
  }

  function openAppPasswordHelp() {
    if (!site) return;
    const url = `${site.siteUrl}/wp-admin/authorize-application.php?app_name=Jetonomy`;
    void WebBrowser.openBrowserAsync(url);
  }

  const inputStyle = {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    color: colors.text,
    fontSize: typography.size.base,
  } as const;

  const labelStyle = {
    color: colors.textMuted,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium as '500',
    marginBottom: spacing[1],
  } as const;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: spacing[6],
          paddingTop: insets.top + spacing[8],
          paddingBottom: insets.bottom + spacing[8],
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            color: colors.text,
            fontSize: typography.size['2xl'],
            fontWeight: typography.weight.bold as '700',
            marginBottom: spacing[2],
          }}
        >
          {site?.siteName ?? 'Jetonomy'}
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.size.base,
            marginBottom: spacing[8],
          }}
        >
          {phase === 'site'
            ? 'Enter your community’s site address to get started.'
            : `Sign in to ${site?.siteUrl ?? 'your community'}.`}
        </Text>

        {phase === 'site' ? (
          <View style={{ gap: spacing[2] }}>
            <Text style={labelStyle}>Site URL</Text>
            <TextInput
              value={siteInput}
              onChangeText={setSiteInput}
              placeholder="https://community.example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={inputStyle}
              editable={!busy}
              onSubmitEditing={handleVerifySite}
              returnKeyType="next"
            />
          </View>
        ) : (
          <View style={{ gap: spacing[4] }}>
            <View style={{ gap: spacing[2] }}>
              <Text style={labelStyle}>Username or email</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={inputStyle}
                editable={!busy}
              />
            </View>
            <View style={{ gap: spacing[2] }}>
              <Text style={labelStyle}>Application Password</Text>
              <TextInput
                value={appPassword}
                onChangeText={setAppPassword}
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                style={inputStyle}
                editable={!busy}
                onSubmitEditing={handleSignIn}
                returnKeyType="go"
              />
            </View>
            <Pressable onPress={openAppPasswordHelp} hitSlop={8}>
              <Text
                style={{
                  color: colors.accent,
                  fontSize: typography.size.sm,
                }}
              >
                How to get an Application Password
              </Text>
            </Pressable>
          </View>
        )}

        {error ? (
          <Text
            style={{
              color: colors.danger,
              fontSize: typography.size.sm,
              marginTop: spacing[4],
            }}
          >
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={phase === 'site' ? handleVerifySite : handleSignIn}
          disabled={busy}
          style={{
            backgroundColor: colors.accent,
            borderRadius: radius.md,
            paddingVertical: spacing[4],
            alignItems: 'center',
            marginTop: spacing[6],
            opacity: busy ? 0.7 : 1,
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
              {phase === 'site' ? 'Continue' : 'Sign in'}
            </Text>
          )}
        </Pressable>

        {phase === 'credentials' ? (
          <Pressable
            onPress={() => {
              setPhase('site');
              setError(null);
            }}
            disabled={busy}
            style={{ alignItems: 'center', marginTop: spacing[4] }}
            hitSlop={8}
          >
            <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
              Use a different site
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
