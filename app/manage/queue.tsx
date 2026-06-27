// app/manage/queue.tsx — global moderation queue (jetonomy_moderate; 403 = gate).
//
// Lists pending post/reply objects with per-row approve/spam/trash, multi-select
// bulk actions, status/type filters, and server-side pagination. Concurrency:
// 409/410 ("already moderated") drops the row silently.

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { Check, Ban, Trash2, CircleSlash } from 'lucide-react-native';

import {
  getQueue,
  approve as approveApi,
  markSpam as spamApi,
  trash as trashApi,
  bulkAction,
} from '@/api/moderation';
import type { ApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type {
  ModeratedType,
  ModerationAction,
  QueueItem,
} from '@/types/moderation';
import { useTheme } from '@/theme/ThemeContext';
import { relativeTime } from '@/utils/date';
import {
  ManageHeader,
  LoadingState,
  ForbiddenState,
  EmptyState,
  ErrorState,
  isForbidden,
} from '@/components/manage/ManageStates';

const PER_PAGE = 20;
const TYPE_FILTERS: Array<{ label: string; value: ModeratedType | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Posts', value: 'post' },
  { label: 'Replies', value: 'reply' },
];

function keyOf(item: QueueItem): string {
  return `${item.object_type}:${item.object_id}`;
}

export default function QueueScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const qc = useQueryClient();
  const [type, setType] = useState<ModeratedType | 'all'>('all');
  const [selected, setSelected] = useState<Record<string, QueueItem>>({});

  const queryKey = useMemo(() => ['mod-queue', type], [type]);

  const q = useInfiniteQuery<ListEnvelope<QueueItem>, ApiError>({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getQueue({ type, page: pageParam as number, per_page: PER_PAGE }),
    getNextPageParam: (last, pages) =>
      last.meta.has_more ? pages.length + 1 : undefined,
  });

  const items: QueueItem[] = q.data?.pages.flatMap((p) => p.data) ?? [];

  const dropRows = (keys: string[]) => {
    const set = new Set(keys);
    qc.setQueryData<typeof q.data>(queryKey, (old: typeof q.data) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((p) => ({
          ...p,
          data: p.data.filter((it) => !set.has(keyOf(it))),
        })),
      };
    });
    setSelected((prev) => {
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
  };

  const rowAction = useMutation<
    void,
    ApiError,
    { action: ModerationAction; item: QueueItem }
  >({
    mutationFn: async ({ action, item }) => {
      const t = item.object_type;
      const id = item.object_id;
      if (action === 'approve') await approveApi(t, id);
      else if (action === 'spam') await spamApi(t, id);
      else await trashApi(t, id);
    },
    onMutate: ({ item }) => {
      dropRows([keyOf(item)]);
    },
    onError: (err, { item }) => {
      // 409/410 → already moderated; keep it dropped. Otherwise refetch to restore.
      if (err.status !== 409 && err.status !== 410) {
        void qc.invalidateQueries({ queryKey });
        void item;
      }
    },
  });

  const bulk = useMutation<void, ApiError, ModerationAction>({
    mutationFn: async (action) => {
      const chosen = Object.values(selected);
      if (chosen.length === 0) return;
      await bulkAction({
        action,
        items: chosen.map((c) => ({ type: c.object_type, id: c.object_id })),
      });
    },
    onMutate: (_action) => {
      dropRows(Object.keys(selected));
    },
    onError: (err) => {
      if (err.status !== 409 && err.status !== 410) {
        void qc.invalidateQueries({ queryKey });
      }
    },
  });

  const toggleSelect = (item: QueueItem) => {
    const k = keyOf(item);
    setSelected((prev) => {
      const next = { ...prev };
      if (next[k]) delete next[k];
      else next[k] = item;
      return next;
    });
  };

  const selectedCount = Object.keys(selected).length;

  if (q.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="Moderation queue" />
        <LoadingState />
      </View>
    );
  }
  if (q.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="Moderation queue" />
        {isForbidden(q.error) ? (
          <ForbiddenState message="You aren't a moderator on this site." />
        ) : (
          <ErrorState message={(q.error as ApiError)?.message} onRetry={() => q.refetch()} />
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ManageHeader title="Moderation queue" />

      {/* Type filter */}
      <View style={{ flexDirection: 'row', gap: spacing[2], padding: spacing[3] }}>
        {TYPE_FILTERS.map((f) => {
          const active = type === f.value;
          return (
            <Pressable
              key={f.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setType(f.value)}
              style={{
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[1],
                borderRadius: radius.full,
                backgroundColor: active ? colors.accent : colors.bgSubtle,
                borderWidth: 1,
                borderColor: active ? colors.accent : colors.border,
              }}
            >
              <Text
                style={{
                  color: active ? colors.accentFg : colors.text,
                  fontSize: typography.size.sm,
                }}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={items}
        keyExtractor={keyOf}
        renderItem={({ item }) => (
          <QueueRow
            item={item}
            selected={Boolean(selected[keyOf(item)])}
            onToggle={() => toggleSelect(item)}
            onAction={(action) => rowAction.mutate({ action, item })}
          />
        )}
        contentContainerStyle={{
          padding: spacing[4],
          gap: spacing[3],
          paddingBottom: spacing[12],
        }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
        }}
        ListEmptyComponent={<EmptyState title="Queue clear" subtitle="Nothing is waiting for moderation." />}
        ListFooterComponent={
          q.isFetchingNextPage ? (
            <View style={{ paddingVertical: spacing[4] }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null
        }
      />

      {/* Bulk action bar */}
      {selectedCount > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            padding: spacing[3],
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ flex: 1, color: colors.text, fontWeight: typography.weight.semibold as '600' }}>
            {selectedCount} selected
          </Text>
          <BulkBtn label="Approve" color={colors.success} onPress={() => bulk.mutate('approve')} />
          <BulkBtn label="Spam" color={colors.textMuted} onPress={() => bulk.mutate('spam')} />
          <BulkBtn label="Trash" color={colors.danger} onPress={() => bulk.mutate('trash')} />
        </View>
      ) : null}
    </View>
  );
}

function BulkBtn({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  const { spacing, radius, typography } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[2],
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: color,
      }}
    >
      <Text style={{ color, fontSize: typography.size.sm, fontWeight: typography.weight.semibold as '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function QueueRow({
  item,
  selected,
  onToggle,
  onAction,
}: {
  item: QueueItem;
  selected: boolean;
  onToggle: () => void;
  onAction: (a: ModerationAction) => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const ago = relativeTime(item.created);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`Select ${item.object_type} by ${item.author?.display_name ?? 'unknown'}`}
      onLongPress={onToggle}
      onPress={onToggle}
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
        borderRadius: radius.md,
        padding: spacing[4],
        gap: spacing[2],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <Text
          style={{
            color: colors.accent,
            fontSize: typography.size.xs,
            fontWeight: typography.weight.semibold as '600',
            textTransform: 'uppercase',
          }}
        >
          {item.object_type}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
          {item.author?.display_name ?? 'Unknown'}
          {ago ? ` · ${ago}` : ''}
        </Text>
        {item.flags_count > 0 ? (
          <Text style={{ color: colors.danger, fontSize: typography.size.xs }}>
            ⚑ {item.flags_count}
          </Text>
        ) : null}
      </View>
      <Text numberOfLines={3} style={{ color: colors.text, fontSize: typography.size.sm }}>
        {item.excerpt || '(no preview)'}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[1] }}>
        <RowBtn icon={Check} label="Approve" color={colors.success} onPress={() => onAction('approve')} />
        <RowBtn icon={CircleSlash} label="Spam" color={colors.textMuted} onPress={() => onAction('spam')} />
        <RowBtn icon={Trash2} label="Trash" color={colors.danger} onPress={() => onAction('trash')} />
        <View style={{ flex: 1 }} />
        <RowBtn icon={Ban} label="Select" color={colors.accent} onPress={onToggle} />
      </View>
    </Pressable>
  );
}

function RowBtn({
  icon: Icon,
  label,
  color,
  onPress,
}: {
  icon: typeof Check;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const { spacing, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing[2],
        paddingVertical: spacing[1],
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: color,
      }}
    >
      <Icon color={color} size={15} />
    </Pressable>
  );
}
