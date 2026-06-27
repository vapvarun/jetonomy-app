// components/announcements/AnnouncementBanner.tsx — dismissible Home banner.
//
// Self-gating: fetches active site announcements (api/announcements.listActive,
// which returns [] on 403/404), filters out locally-dismissed ids, and renders
// nothing when there is nothing to show. Carousel when >1 (server caps at 5).
// Tap → open the pinned post. Mount it at the top of Home; it costs nothing
// when there are no announcements or the member can't read them.

import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, X } from 'lucide-react-native';

import { listActive } from '@/api/announcements';
import { useAnnouncementStore } from '@/stores/announcementStore';
import { useIsAuthed } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import type { SiteAnnouncement } from '@/types/announcements';

export default function AnnouncementBanner() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const authed = useIsAuthed();
  const { width } = useWindowDimensions();

  const dismissed = useAnnouncementStore((s) => s.dismissed);
  const dismiss = useAnnouncementStore((s) => s.dismiss);
  const hydrate = useAnnouncementStore((s) => s.hydrate);
  const hydrated = useAnnouncementStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  const { data } = useQuery<SiteAnnouncement[], Error>({
    queryKey: ['site-announcements', 'active'],
    queryFn: listActive,
    enabled: authed,
    staleTime: 5 * 60_000,
  });

  const [, setTick] = useState(0);

  const all: SiteAnnouncement[] = data ?? [];
  const items = all.filter((a) => !dismissed[a.id]).slice(0, 5);
  if (!authed || items.length === 0) return null;

  const onDismiss = (id: number) => {
    dismiss(id);
    setTick((t) => t + 1);
  };

  const cardWidth = items.length > 1 ? Math.min(width - spacing[4] * 2, 360) : undefined;

  const Card = ({ a }: { a: SiteAnnouncement }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a.title || 'Open announcement'}
      onPress={() => router.push(`/post/${a.id}`)}
      style={{
        width: cardWidth,
        flexDirection: 'row',
        gap: spacing[2],
        backgroundColor: colors.bgSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing[3],
      }}
    >
      <Megaphone color={colors.accent} size={18} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{
            color: colors.text,
            fontSize: typography.size.sm,
            fontWeight: typography.weight.semibold as '600',
          }}
        >
          {a.title || 'Announcement'}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss announcement"
        onPress={() => onDismiss(a.id)}
        hitSlop={10}
      >
        <X color={colors.textMuted} size={18} />
      </Pressable>
    </Pressable>
  );

  if (items.length === 1) {
    return (
      <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[3] }}>
        <Card a={items[0]} />
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: spacing[4],
        paddingTop: spacing[3],
        gap: spacing[2],
      }}
    >
      {items.map((a) => (
        <Card key={a.id} a={a} />
      ))}
    </ScrollView>
  );
}
