// app/communities.tsx — multi-community switcher (generic app only).
//
// Lists every saved community, shows which is active, lets the member switch,
// remove, or add another. Hidden for white-label builds (single baked site).

import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, '');
  }
}

export default function CommunitiesScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const savedSites = useAuthStore((s) => s.savedSites);
  const activeSiteUrl = useAuthStore((s) => s.activeSiteUrl);
  const sites = useAuthStore((s) => s.sites);
  const switchSite = useAuthStore((s) => s.switchSite);
  const removeSite = useAuthStore((s) => s.removeSite);
  const startAddSite = useAuthStore((s) => s.startAddSite);
  const cancelAddSite = useAuthStore((s) => s.cancelAddSite);

  const [busy, setBusy] = useState(false);

  // Returning here (e.g. backing out of the add-a-community login) clears the
  // add-mode gate exception so it can't leak.
  useFocusEffect(
    useCallback(() => {
      cancelAddSite();
    }, [cancelAddSite])
  );

  const goSwitch = async (url: string) => {
    if (busy || url === activeSiteUrl) {
      if (url === activeSiteUrl) router.back();
      return;
    }
    setBusy(true);
    try {
      await switchSite(url);
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (url: string) => {
    Alert.alert(
      'Remove community?',
      `Sign out of ${hostOf(url)} on this device. Your account isn't affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void removeSite(url) },
      ]
    );
  };

  const addCommunity = () => {
    startAddSite();
    router.push('/(auth)/login');
  };

  const headerStyle = {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold as '700',
    color: colors.text,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
          paddingHorizontal: spacing[5],
          paddingVertical: spacing[4],
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={{ color: colors.accent, fontSize: typography.size.base }}>‹ Back</Text>
        </Pressable>
        <Text style={headerStyle}>Communities</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing[5], paddingBottom: insets.bottom + spacing[8] }}
      >
        {savedSites.map((url) => {
          const session = sites[url];
          const name =
            session?.appConfig?.app_name ||
            session?.siteIndex?.name ||
            hostOf(url);
          const logo = session?.appConfig?.logo_url || null;
          const isActive = url === activeSiteUrl;
          return (
            <View
              key={url}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[3],
                backgroundColor: isActive ? colors.bgSubtle : colors.bg,
                borderColor: isActive ? colors.accent : colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                padding: spacing[3],
                marginBottom: spacing[3],
              }}
            >
              <Pressable
                onPress={() => goSwitch(url)}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}
              >
                {logo ? (
                  <Image
                    source={{ uri: logo }}
                    resizeMode="contain"
                    style={{ width: 40, height: 40, borderRadius: radius.sm }}
                  />
                ) : (
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.sm,
                      backgroundColor: colors.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{ color: colors.text, fontWeight: typography.weight.semibold as '600' }}
                  >
                    {name}
                  </Text>
                  <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
                    {hostOf(url)}
                  </Text>
                </View>
                {isActive ? (
                  <Text style={{ color: colors.accent, fontSize: typography.size.sm }}>● Active</Text>
                ) : null}
              </Pressable>
              <Pressable onPress={() => confirmRemove(url)} hitSlop={8}>
                <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>Remove</Text>
              </Pressable>
            </View>
          );
        })}

        <Pressable
          onPress={addCommunity}
          style={{
            borderColor: colors.border,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderRadius: radius.md,
            padding: spacing[4],
            alignItems: 'center',
            marginTop: spacing[2],
          }}
        >
          <Text style={{ color: colors.accent, fontWeight: typography.weight.semibold as '600' }}>
            + Add a community
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
