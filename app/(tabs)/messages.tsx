// app/(tabs)/messages.tsx — Messages tab (Pro, gated features.messaging). Active /
// Archived segmented control, infinite conversation list, pull-to-refresh, and a
// "New message" FAB. The tab itself is hidden by the shell when messaging is off;
// this screen also self-guards for deep-link safety.

import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Pencil } from 'lucide-react-native';

import ConversationItem, { ConversationItemSkeleton } from '@/components/ConversationItem';
import { useConversationList } from '@/hooks/useConversations';
import { useFeatures } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import type { Conversation, ConversationFilter } from '@/types/conversation';

const SEGMENTS: { key: ConversationFilter; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'archived', label: 'Archived' },
];

export default function MessagesScreen() {
  const { messaging } = useFeatures();
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<ConversationFilter>('active');

  const {
    conversations,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversationList(filter);

  if (!messaging) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing[6] }}>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.base, textAlign: 'center' }}>
          Messaging is not available on this community.
        </Text>
      </View>
    );
  }

  const openThread = (c: Conversation) => router.push(`/conversation/${c.id}`);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing[3],
          paddingHorizontal: spacing[4],
          paddingBottom: spacing[2],
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: spacing[3],
        }}
      >
        <Text style={{ color: colors.text, fontSize: typography.size['2xl'], fontWeight: typography.weight.bold as '700' }}>
          Messages
        </Text>
        {/* Segmented control */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.bgSubtle, borderRadius: radius.md, padding: 3 }}>
          {SEGMENTS.map((seg) => {
            const active = filter === seg.key;
            return (
              <Pressable
                key={seg.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(seg.key)}
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
                  {seg.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[2] }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ConversationItemSkeleton key={`sk-${i}`} />
          ))}
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
          <Text style={{ color: colors.text }}>Could not load conversations.</Text>
          <Pressable onPress={() => refetch()} accessibilityRole="button">
            <Text style={{ color: colors.accent }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: insets.bottom + spacing[12] }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: colors.border }} />
          )}
          renderItem={({ item }) => <ConversationItem conversation={item} onPress={openThread} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: spacing[12], gap: spacing[2] }}>
              <Text style={{ color: colors.text, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>
                {filter === 'archived' ? 'No archived conversations' : 'No conversations yet'}
              </Text>
              {filter === 'active' ? (
                <Pressable accessibilityRole="button" onPress={() => router.push('/conversation/new')}>
                  <Text style={{ color: colors.accent, fontSize: typography.size.sm }}>Start a conversation</Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: spacing[4] }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : null
          }
        />
      )}

      {/* New message FAB */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New message"
        onPress={() => router.push('/conversation/new')}
        style={{
          position: 'absolute',
          right: spacing[5],
          bottom: insets.bottom + spacing[5],
          width: 56,
          height: 56,
          borderRadius: radius.full,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <Pencil color={colors.accentFg} size={24} />
      </Pressable>
    </View>
  );
}
