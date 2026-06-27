// app/manage/ai.tsx — AI usage dashboard (Pro, read-only; manage_options).

import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
} from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { usage, usageSummary } from '@/api/ai';
import type { ApiError } from '@/api/client';
import type { ListEnvelope } from '@/types/api';
import type { AiUsageRow, AiUsageSummary } from '@/types/ai';
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

const PER_PAGE = 30;

export default function AiUsageScreen() {
  const { colors, spacing, radius, typography } = useTheme();

  const summary = useQuery<AiUsageSummary, ApiError>({
    queryKey: ['ai', 'summary'],
    queryFn: () => usageSummary(),
  });

  const rows = useInfiniteQuery<ListEnvelope<AiUsageRow>, ApiError>({
    queryKey: ['ai', 'usage'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => usage({ page: pageParam as number, per_page: PER_PAGE }),
    getNextPageParam: (last, pages) => (last.meta.has_more ? pages.length + 1 : undefined),
  });

  if (rows.isLoading && summary.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="AI usage" />
        <LoadingState />
      </View>
    );
  }
  if (rows.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="AI usage" />
        {isForbidden(rows.error) ? (
          <ForbiddenState message="Admin access required." />
        ) : (
          <ErrorState message={rows.error?.message} onRetry={() => rows.refetch()} />
        )}
      </View>
    );
  }

  const items: AiUsageRow[] = rows.data?.pages.flatMap((p) => p.data) ?? [];
  const s = summary.data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ManageHeader title="AI usage" />
      <FlatList
        data={items}
        keyExtractor={(r) => String(r.id)}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', gap: spacing[3], marginBottom: spacing[3] }}>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing[4],
              }}
            >
              <Text style={{ color: colors.text, fontSize: typography.size.xl, fontWeight: typography.weight.bold as '700' }}>
                {s?.total_tokens ?? 0}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>Total tokens</Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing[4],
              }}
            >
              <Text style={{ color: colors.text, fontSize: typography.size.xl, fontWeight: typography.weight.bold as '700' }}>
                ${(s?.total_cost ?? 0).toFixed(2)}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>Total cost</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: spacing[2],
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: typography.size.sm }}>
                {item.feature} · {item.model}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
                {relativeTime(item.created_at)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: colors.text, fontSize: typography.size.sm }}>{item.total_tokens} tok</Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
                ${item.cost.toFixed(3)}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[12] }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (rows.hasNextPage && !rows.isFetchingNextPage) rows.fetchNextPage();
        }}
        ListEmptyComponent={<EmptyState title="No usage" subtitle="No AI calls have been recorded." />}
        ListFooterComponent={
          rows.isFetchingNextPage ? (
            <View style={{ paddingVertical: spacing[4] }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null
        }
      />
    </View>
  );
}
