// app/manage/flags.tsx — global flags list + resolve (jetonomy_moderate; 403 = gate).

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { CheckCircle2, ExternalLink } from 'lucide-react-native';

import { listFlags, resolveFlag } from '@/api/moderation';
import type { ApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type { Flag } from '@/types/moderation';
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
const STATUS_FILTERS = ['open', 'resolved', 'all'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default function FlagsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const qc = useQueryClient();
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>('open');

  const queryKey = useMemo(() => ['mod-flags', status], [status]);

  const q = useInfiniteQuery<ListEnvelope<Flag>, ApiError>({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listFlags({
        status: status === 'all' ? undefined : status,
        page: pageParam as number,
        per_page: PER_PAGE,
      }),
    getNextPageParam: (last, pages) =>
      last.meta.has_more ? pages.length + 1 : undefined,
  });

  const items: Flag[] = q.data?.pages.flatMap((p) => p.data) ?? [];

  const resolve = useMutation<void, ApiError, number>({
    mutationFn: async (id) => {
      await resolveFlag(id, { action: 'approve' });
    },
    onMutate: (id) => {
      qc.setQueryData<typeof q.data>(queryKey, (old: typeof q.data) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            data: p.data.filter((f) => f.id !== id),
          })),
        };
      });
    },
    onError: (err) => {
      // Already resolved by someone else → keep dropped; else restore.
      if (err.status !== 409 && err.status !== 410) {
        void qc.invalidateQueries({ queryKey });
      }
    },
  });

  if (q.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="Flags" />
        <LoadingState />
      </View>
    );
  }
  if (q.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="Flags" />
        {isForbidden(q.error) ? (
          <ForbiddenState message="You aren't a moderator on this site." />
        ) : (
          <ErrorState message={q.error?.message} onRetry={() => q.refetch()} />
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ManageHeader title="Flags" />
      <View style={{ flexDirection: 'row', gap: spacing[2], padding: spacing[3] }}>
        {STATUS_FILTERS.map((s) => {
          const active = status === s;
          return (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setStatus(s)}
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
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={items}
        keyExtractor={(f) => String(f.id)}
        renderItem={({ item }) => (
          <FlagRow
            flag={item}
            onResolve={() => resolve.mutate(item.id)}
            onOpen={() => {
              if (item.object_type === 'post') router.push(`/post/${item.object_id}`);
            }}
          />
        )}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: spacing[12] }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
        }}
        ListEmptyComponent={<EmptyState title="No flags" subtitle="Nothing has been reported." />}
        ListFooterComponent={
          q.isFetchingNextPage ? (
            <View style={{ paddingVertical: spacing[4] }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

function FlagRow({
  flag,
  onResolve,
  onOpen,
}: {
  flag: Flag;
  onResolve: () => void;
  onOpen: () => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const ago = relativeTime(flag.created);
  const isOpen = flag.status === 'open';
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing[4],
        gap: spacing[2],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <Text
          style={{
            color: colors.danger,
            fontSize: typography.size.xs,
            fontWeight: typography.weight.semibold as '600',
            textTransform: 'uppercase',
          }}
        >
          {String(flag.reason).replace('_', ' ')}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
          {flag.object_type} #{flag.object_id}
          {ago ? ` · ${ago}` : ''}
        </Text>
      </View>
      {flag.note ? (
        <Text style={{ color: colors.text, fontSize: typography.size.sm }}>{flag.note}</Text>
      ) : null}
      <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
        Reported by {flag.reporter?.display_name ?? 'unknown'}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[1] }}>
        {flag.object_type === 'post' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open content"
            onPress={onOpen}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[1],
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <ExternalLink color={colors.accent} size={15} />
            <Text style={{ color: colors.accent, fontSize: typography.size.sm }}>Open</Text>
          </Pressable>
        ) : null}
        {isOpen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Resolve flag"
            onPress={onResolve}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[1],
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.success,
            }}
          >
            <CheckCircle2 color={colors.success} size={15} />
            <Text style={{ color: colors.success, fontSize: typography.size.sm }}>Resolve</Text>
          </Pressable>
        ) : (
          <Text style={{ color: colors.success, fontSize: typography.size.xs, alignSelf: 'center' }}>
            Resolved
          </Text>
        )}
      </View>
    </View>
  );
}
