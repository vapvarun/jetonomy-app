// app/(tabs)/_layout.tsx — bottom-tab shell. Owns tab registration, icons, and
// Pro gating; sibling domains fill the screen files. (Tab contract, 01 §9.)
//
// Tabs: Home · Spaces · Notifications (badge = unread-count) · Messages
// (hidden unless features.messaging) · Profile. Admin lives under app/manage/*.

import { Tabs } from 'expo-router';
import { Bell, Home, LayoutGrid, Mail, User } from 'lucide-react-native';

import { useFeatures } from '@/stores/authStore';
import { useNotificationsBadge } from '@/hooks/useNotificationsBadge';
import { useTheme } from '@/theme/ThemeContext';

export default function TabsLayout() {
  const { colors } = useTheme();
  const features = useFeatures();
  const unread = useNotificationsBadge();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="spaces"
        options={{
          title: 'Spaces',
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <Mail color={color} size={size} />,
          // Hidden on free sites — href:null removes it from the tab bar while
          // keeping the route mountable for deep links if Pro lights up.
          href: features.messaging ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
