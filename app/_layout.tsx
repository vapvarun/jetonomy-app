// app/_layout.tsx — root: providers + boot hydrate + auth gate.

import '@/global.css';

import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import { queryClient, queryPersister, OFFLINE_MAX_AGE } from '@/api/queryClient';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';

function Splash() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
      }}
    >
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const isAddingSite = useAuthStore((s) => s.isAddingSite);
  const segments = useSegments();
  const router = useRouter();
  const { scheme } = useTheme();

  // Native push: foreground handler, device registration, and tap deep-links
  // into native routes (warm + cold start). Self-guards on auth + push support.
  usePushNotifications();

  useEffect(() => {
    if (status === 'unknown') return;
    const inAuthGroup = segments[0] === '(auth)';
    if (status === 'unauthed' && !inAuthGroup) {
      router.replace('/login');
    } else if (status === 'authed' && inAuthGroup && !isAddingSite) {
      // Authed users leave the auth group — unless they deliberately opened
      // login to ADD another community (the switcher's "Add" flow).
      router.replace('/');
    }
  }, [status, segments, router, isAddingSite]);

  if (status === 'unknown') return <Splash />;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateSettings();
    void hydrateAuth();
  }, [hydrateAuth, hydrateSettings]);

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: queryPersister, maxAge: OFFLINE_MAX_AGE }}
      >
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
