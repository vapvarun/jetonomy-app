// app/settings.tsx — appearance (dark mode), email/notification prefs, and
// logout. Digest preferences are a typed Pro seam only (no endpoint exists), so
// that row stays hidden until a route lands.

import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, LogOut } from 'lucide-react-native';

import { DIGEST_ENDPOINT_AVAILABLE } from '@/api/digest';
import { useMe, useUpdateMe } from '@/hooks/useProfile';
import { useAuthStore, useFeatures } from '@/stores/authStore';
import {
  useSettingsStore,
  type ColorSchemePref,
} from '@/stores/settingsStore';
import { useTheme } from '@/theme/ThemeContext';

const SCHEMES: { key: ColorSchemePref; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const features = useFeatures();

  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const setColorScheme = useSettingsStore((s) => s.setColorScheme);

  const { data: me } = useMe();
  const updateMe = useUpdateMe();

  // Optimistic local mirror so toggles feel instant while the PATCH lands.
  const [emailOptOut, setEmailOptOut] = useState<boolean | null>(null);
  const optOut = emailOptOut ?? !!me?.email_opt_out;

  const toggleEmail = (val: boolean) => {
    setEmailOptOut(val);
    updateMe.mutate(
      { email_opt_out: val },
      { onError: () => setEmailOptOut(!val) }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[3],
          paddingBottom: spacing[2],
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={colors.text} size={24} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing[4], gap: spacing[6], paddingBottom: insets.bottom + spacing[12] }}
      >
        {/* Appearance */}
        <Section title="Appearance">
          <View style={{ flexDirection: 'row', backgroundColor: colors.bgSubtle, borderRadius: radius.md, padding: 3 }}>
            {SCHEMES.map((s) => {
              const active = colorScheme === s.key;
              return (
                <Pressable
                  key={s.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setColorScheme(s.key)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: spacing[2],
                    borderRadius: radius.sm,
                    backgroundColor: active ? colors.surface : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: active ? colors.text : colors.textMuted,
                      fontSize: typography.size.sm,
                      fontWeight: (active ? typography.weight.semibold : typography.weight.regular) as '600' | '400',
                    }}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Notifications / Email */}
        <Section title="Email">
          <Row
            title="Opt out of emails"
            subtitle="Stop all community email notifications."
            right={
              me ? (
                <Switch
                  value={optOut}
                  onValueChange={toggleEmail}
                  trackColor={{ true: colors.accent, false: colors.border }}
                  accessibilityLabel="Opt out of emails"
                />
              ) : (
                <ActivityIndicator color={colors.accent} />
              )
            }
          />

          {/* Digest — Pro seam, hidden until an endpoint exists. */}
          {features.custom_fields && DIGEST_ENDPOINT_AVAILABLE ? (
            <Row title="Email digest" subtitle="Periodic summary of community activity." right={null} />
          ) : null}
        </Section>

        {/* Account */}
        <Section title="Account">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={() => {
              void signOut();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing[2],
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              paddingVertical: spacing[3],
            }}
          >
            <LogOut color={colors.danger} size={18} />
            <Text style={{ color: colors.danger, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>
              Sign out
            </Text>
          </Pressable>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ gap: spacing[3] }}>
      <Text style={{ color: colors.textMuted, fontSize: typography.size.xs, fontWeight: typography.weight.semibold as '600', textTransform: 'uppercase' }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ title, subtitle, right }: { title: string; subtitle?: string; right: React.ReactNode }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: typography.size.base }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
