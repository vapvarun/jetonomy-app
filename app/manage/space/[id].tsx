// app/manage/space/[id].tsx — per-space moderation (scoped).
//
// Space moderators see THIS space's flags and can resolve / act on its objects.
// 403 here means "not a moderator of THIS space" — a scoped ForbiddenState, not
// a global auth failure. When opened without a real id (the generic Manage tile
// uses 0), prompt for a space id.

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { Check, CircleSlash, Trash2, CheckCircle2 } from 'lucide-react-native';

import {
  listSpaceFlags,
  resolveSpaceFlag,
  actOnSpaceObject,
} from '@/api/moderation';
import type { ApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type { Flag, ModerationAction } from '@/types/moderation';
import { useTheme } from '@/theme/ThemeContext';
import { relativeTime } from '@/utils/date';
import { dedupeBy } from '@/utils/dedupe';
import {
  ManageHeader,
  LoadingState,
  ForbiddenState,
  EmptyState,
  ErrorState,
  isForbidden,
} from '@/components/manage/ManageStates';

const PER_PAGE = 20;

export default function SpaceModerationScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const spaceId = Number(params.id ?? 0) || 0;

  if (spaceId <= 0) {
    return <SpacePicker />;
  }
  return <SpaceQueue spaceId={spaceId} key={spaceId} />;
}

function SpacePicker() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const [val, setVal] = useState('');
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ManageHeader title="Space moderation" />
      <View style={{ padding: spacing[4], gap: spacing[3] }}>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
          Open from a space you manage, or enter a space id.
        </Text>
        <TextInput
          placeholder="Space id"
          placeholderTextColor={colors.textMuted}
          value={val}
          onChangeText={setVal}
          keyboardType="number-pad"
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing[3],
            color: colors.text,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open space"
          disabled={!Number(val)}
          onPress={() => router.push(`/manage/space/${Number(val)}`)}
          style={{
            alignItems: 'center',
            backgroundColor: Number(val) ? colors.accent : colors.border,
            borderRadius: radius.md,
            paddingVertical: spacing[3],
          }}
        >
          <Text style={{ color: colors.accentFg, fontWeight: typography.weight.semibold as '600' }}>
            Open
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function SpaceQueue({ spaceId }: { spaceId: number }) {
  const { colors, spacing } = useTheme();
  const qc = useQueryClient();
  const queryKey = useMemo(() => ['space-flags', spaceId], [spaceId]);

  const q = useInfiniteQuery<ListEnvelope<Flag>, ApiError>({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listSpaceFlags(spaceId, { page: pageParam as number, per_page: PER_PAGE }),
    getNextPageParam: (last, pages) =>
      last.meta.has_more ? pages.length + 1 : undefined,
  });

  // Page-number paging re-counts a flag onto the next page when the list shifts
  // between fetches; dedupe by id so FlatList keys stay unique.
  const items: Flag[] = dedupeBy(
    q.data?.pages.flatMap((p) => p.data) ?? [],
    (f) => f.id
  );

  const drop = (id: number) => {
    qc.setQueryData<typeof q.data>(queryKey, (old: typeof q.data) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((p) => ({ ...p, data: p.data.filter((f) => f.id !== id) })),
      };
    });
  };

  const resolve = useMutation<void, ApiError, number>({
    mutationFn: async (flagId) => {
      await resolveSpaceFlag(spaceId, flagId, { action: 'approve' });
    },
    onMutate: (flagId) => drop(flagId),
    onError: (err) => {
      if (err.status !== 409 && err.status !== 410) void qc.invalidateQueries({ queryKey });
    },
  });

  const act = useMutation<void, ApiError, { flag: Flag; action: ModerationAction }>({
    mutationFn: async ({ flag, action }) => {
      await actOnSpaceObject(spaceId, action, flag.object_type, flag.object_id);
    },
    onMutate: ({ flag }) => drop(flag.id),
    onError: (err) => {
      if (err.status !== 409 && err.status !== 410) void qc.invalidateQueries({ queryKey });
    },
  });

  if (q.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title={`Space #${spaceId}`} />
        <LoadingState />
      </View>
    );
  }
  if (q.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title={`Space #${spaceId}`} />
        {isForbidden(q.error) ? (
          <ForbiddenState message="You don't moderate this space." />
        ) : (
          <ErrorState message={q.error?.message} onRetry={() => q.refetch()} />
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ManageHeader title={`Space #${spaceId}`} />
      <FlatList
        data={items}
        keyExtractor={(f) => String(f.id)}
        renderItem={({ item }) => (
          <SpaceFlagRow
            flag={item}
            onResolve={() => resolve.mutate(item.id)}
            onAct={(action) => act.mutate({ flag: item, action })}
          />
        )}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: spacing[12] }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
        }}
        ListEmptyComponent={<EmptyState title="No flags" subtitle="This space's queue is clear." />}
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

function SpaceFlagRow({
  flag,
  onResolve,
  onAct,
}: {
  flag: Flag;
  onResolve: () => void;
  onAct: (a: ModerationAction) => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const ago = relativeTime(flag.created);
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
      <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[1] }}>
        <ActBtn icon={Check} label="Approve" color={colors.success} onPress={() => onAct('approve')} />
        <ActBtn icon={CircleSlash} label="Spam" color={colors.textMuted} onPress={() => onAct('spam')} />
        <ActBtn icon={Trash2} label="Trash" color={colors.danger} onPress={() => onAct('trash')} />
        <View style={{ flex: 1 }} />
        <ActBtn icon={CheckCircle2} label="Resolve" color={colors.accent} onPress={onResolve} />
      </View>
    </View>
  );
}

function ActBtn({
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
