// app/(auth)/_layout.tsx — pre-auth stack (login + phase-2 authorize stub).

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
