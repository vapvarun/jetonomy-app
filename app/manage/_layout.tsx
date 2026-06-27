// app/manage/_layout.tsx — admin section stack (entered from Profile ▸ Manage).
// Each screen renders its own ManageHeader + handles 403 as the real gate.

import { Stack } from 'expo-router';

export default function ManageLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
