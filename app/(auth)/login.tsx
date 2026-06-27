// app/(auth)/login.tsx — site-discovery-first, multi-tenant login.
//
// Flow: enter Site URL -> verifyJetonomySite() -> CONNECT.
// The primary "Connect" path opens the WP-core Application Passwords authorize
// screen (utils/appPasswordAuth.connectWithAppPassword) in a secure auth
// session; on approval WP redirects to <scheme>://auth with the App Password,
// which we validate via core wp/v2/users/me and store through authStore.signIn.
// Manual app-password entry stays available as a fallback.
//
// White-label builds (branding.SITE_URL_HARDCODED) skip the Site URL phase +
// discovery and go straight to Connect for the baked SITE_URL. Generic builds
// __DEV__-prefill forums.local; production starts empty.

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

import { login } from '@/api/auth';
import { toApiError } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import { SITE_URL, SITE_URL_HARDCODED } from '@/theme/branding';
import { verifyJetonomySite, type SiteValidation } from '@/utils/apiDiscovery';
import { connectWithAppPassword } from '@/utils/appPasswordAuth';

type Phase = 'site' | 'credentials';

const DEV_SITE = __DEV__ ? 'http://forums.local' : '';

/** Synthetic SiteValidation for a white-label baked site (no discovery needed). */
const HARDCODED_SITE: SiteValidation | null =
  SITE_URL_HARDCODED && SITE_URL
    ? {
        ok: true,
        hasJetonomy: true,
        siteName: null,
        siteIcon: null,
        siteUrl: SITE_URL.replace(/\/+$/, ''),
      }
    : null;

export default function LoginScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const signIn = useAuthStore((s) => s.signIn);

  const [phase, setPhase] = useState<Phase>(
    SITE_URL_HARDCODED ? 'credentials' : 'site'
  );
  const [siteInput, setSiteInput] = useState(SITE_URL_HARDCODED ? '' : DEV_SITE);
  const [site, setSite] = useState<SiteValidation | null>(HARDCODED_SITE);
  const [manual, setManual] = useState(false);
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

  /** Primary path — open the WP authorize screen and store the granted App Password. */
  async function handleConnect() {
    if (!site) return;
    setError(null);
    setBusy(true);
    try {
      const result = await connectWithAppPassword(site.siteUrl);
      if (result.type === 'cancel') {
        return; // user dismissed the sheet — silent, let them retry
      }
      if (result.type === 'rejected') {
        setError(
          'Authorization was declined. Try again, or use an application password below.'
        );
        return;
      }
      const { siteUrl, user, password } = result.creds;
      const me = await login(siteUrl, user, password); // validates via core users/me
      await signIn(siteUrl, user, password, me);
      // Root layout's auth gate routes to the tabs on status === 'authed'.
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

  /** Fallback path — manual username + Application Password entry. */
  async function handleManualSignIn() {
    if (!site) return;
    setError(null);
    setBusy(true);
    try {
      const me = await login(site.siteUrl, username.trim(), appPassword.trim());
      await signIn(site.siteUrl, username.trim(), appPassword.trim(), me);
    } catch (e) {
      const apiErr = toApiError(e);
      setError(
        apiErr.status === 401
          ? 'Wrong username or application password.'
          : apiErr.message
      );
    } finally {
      setBusy(false);
    }
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

  const linkStyle = {
    color: colors.accent,
    fontSize: typography.size.sm,
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
        ) : !manual ? (
          // Primary connect path.
          <View style={{ gap: spacing[3] }}>
            <Pressable
              onPress={handleConnect}
              disabled={busy}
              style={{
                backgroundColor: colors.accent,
                borderRadius: radius.md,
                paddingVertical: spacing[4],
                alignItems: 'center',
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
                  Connect with WordPress
                </Text>
              )}
            </Pressable>
            <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
              You’ll approve access in your community’s login, then come straight
              back — no password to copy.
            </Text>
            <Pressable
              onPress={() => {
                setManual(true);
                setError(null);
              }}
              disabled={busy}
              hitSlop={8}
              style={{ marginTop: spacing[2] }}
            >
              <Text style={linkStyle}>Use an application password instead</Text>
            </Pressable>
          </View>
        ) : (
          // Fallback manual app-password path.
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
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
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
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                secureTextEntry
                style={inputStyle}
                editable={!busy}
                onSubmitEditing={handleManualSignIn}
                returnKeyType="go"
              />
            </View>
            <Pressable
              onPress={() => {
                setManual(false);
                setError(null);
              }}
              hitSlop={8}
            >
              <Text style={linkStyle}>Connect with WordPress instead</Text>
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

        {/* Primary CTA for the site + manual phases (connect phase has its own button). */}
        {phase === 'site' || manual ? (
          <Pressable
            onPress={phase === 'site' ? handleVerifySite : handleManualSignIn}
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
        ) : null}

        {phase === 'credentials' && !SITE_URL_HARDCODED ? (
          <Pressable
            onPress={() => {
              setPhase('site');
              setManual(false);
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
