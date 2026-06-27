// app/(tabs)/notifications.tsx — notification feed: filter chips, mark-all-read,
// multi-select bulk (mark_read/delete), pull-to-refresh, infinite scroll, and
// deep-link on tap (native routes via object_type + object_id).

import { useCallback, useState } from 'react';
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
import { CheckCheck, Trash2, X } from 'lucide-react-native';

import NotificationItemRow, { notificationHref } from '@/components/NotificationItem';
import {
  useBulk,
  useDismiss,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from '@/hooks/useNotifications';
import { useTheme } from '@/theme/ThemeContext';
import type {
  NotificationFilter,
  NotificationItem as Notification,
} from '@/types/notification';

const FILTERS: { key: NotificationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'replies', label: 'Replies' },
  { key: 'votes', label: 'Votes' },
  { key: 'badges', label: 'Badges' },
];

export default function NotificationsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const selectionMode = selected.size > 0;

  const {
    items,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications(filter);

  const markRead = useMarkRead();
  const dismiss = useDismiss();
  const markAllRead = useMarkAllRead();
  const bulk = useBulk();

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onActivate = useCallback(
    (item: Notification) => {
      if (!item.is_read) markRead.mutate(item.id);
      const href = notificationHref(item);
      if (href) router.push(href);
    },
    [markRead, router]
  );

  const runBulk = useCallback(
    (action: 'mark_read' | 'delete') => {
      const ids = Array.from(selected);
      if (ids.length === 0) return;
      bulk.mutate({ action, ids });
      clearSelection();
    },
    [bulk, selected, clearSelection]
  );

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
        {selectionMode ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel selection" onPress={clearSelection} hitSlop={8}>
              <X color={colors.text} size={22} />
            </Pressable>
            <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600', flex: 1 }}>
              {selected.size} selected
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Mark selected read" onPress={() => runBulk('mark_read')} hitSlop={8}>
              <CheckCheck color={colors.accent} size={22} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Delete selected" onPress={() => runBulk('delete')} hitSlop={8}>
              <Trash2 color={colors.danger} size={22} />
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: typography.size['2xl'], fontWeight: typography.weight.bold as '700', flex: 1 }}>
              Notifications
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
              onPress={() => markAllRead.mutate()}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <CheckCheck color={colors.accent} size={18} />
              <Text style={{ color: colors.accent, fontSize: typography.size.sm }}>Mark all</Text>
            </Pressable>
          </View>
        )}

        {/* Filter chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(f) => f.key}
          contentContainerStyle={{ gap: spacing[2] }}
          renderItem={({ item: f }) => {
            const active = filter === f.key;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setFilter(f.key);
                  clearSelection();
                }}
                style={{
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[1],
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accent : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: active ? colors.accentFg : colors.textMuted,
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.medium as '500',
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={{ padding: spacing[4], gap: spacing[3] }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{ height: 64, borderRadius: radius.md, backgroundColor: colors.bgSubtle }}
            />
          ))}
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
          <Text style={{ color: colors.text }}>Could not load notifications.</Text>
          <Pressable onPress={() => refetch()} accessibilityRole="button">
            <Text style={{ color: colors.accent }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={{
            padding: spacing[4],
            gap: spacing[2],
            paddingBottom: insets.bottom + spacing[10],
          }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          renderItem={({ item }) => (
            <NotificationItemRow
              item={item}
              selectionMode={selectionMode}
              selected={selected.has(item.id)}
              onPress={onActivate}
              onToggleSelect={toggleSelect}
              onDismiss={(id) => dismiss.mutate(id)}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: spacing[12], gap: spacing[2] }}>
              <Text style={{ color: colors.text, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>
                You're all caught up
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
                New notifications will appear here.
              </Text>
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
    </View>
  );
}
