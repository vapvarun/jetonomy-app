// app/manage/analytics.tsx — admin analytics dashboard (Pro; manage_options).
//
// Renders Error/Forbidden states (never a blank dashboard — 1.4.2.x analytics
// surfaces auth errors). Overview gates the whole screen; sub-cards load
// independently. Export shares the raw CSV/JSON; diff-report is behind Advanced.

import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Download, ChevronDown, ChevronUp } from 'lucide-react-native';

import {
  overview,
  engagement,
  topSpaces,
  topContributors,
  moderationStats,
  exportData,
  diffReport,
} from '@/api/analytics';
import type { ApiError } from '@/api/client';
import type { TopContributor, TopSpace } from '@/types/analytics';
import { useTheme } from '@/theme/ThemeContext';
import {
  ManageHeader,
  LoadingState,
  ForbiddenState,
  ErrorState,
  isForbidden,
} from '@/components/manage/ManageStates';

export default function AnalyticsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const [advanced, setAdvanced] = useState(false);
  const [exporting, setExporting] = useState(false);

  const ov = useQuery<Awaited<ReturnType<typeof overview>>, ApiError>({
    queryKey: ['analytics', 'overview'],
    queryFn: () => overview(),
  });
  const eng = useQuery({ queryKey: ['analytics', 'engagement'], queryFn: () => engagement() });
  const spaces = useQuery({ queryKey: ['analytics', 'top-spaces'], queryFn: () => topSpaces(5) });
  const contrib = useQuery({
    queryKey: ['analytics', 'top-contributors'],
    queryFn: () => topContributors(5),
  });
  const mod = useQuery({ queryKey: ['analytics', 'moderation'], queryFn: () => moderationStats() });
  const diff = useQuery({
    queryKey: ['analytics', 'diff'],
    queryFn: () => diffReport(),
    enabled: advanced,
  });

  const doExport = async () => {
    try {
      setExporting(true);
      const { body, format } = await exportData();
      await Share.share({ message: body, title: `analytics.${format}` });
    } catch {
      // share cancelled / export failed — silent
    } finally {
      setExporting(false);
    }
  };

  if (ov.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="Analytics" />
        <LoadingState />
      </View>
    );
  }
  if (ov.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="Analytics" />
        {isForbidden(ov.error) ? (
          <ForbiddenState message="Analytics requires admin access." />
        ) : (
          <ErrorState message={ov.error?.message} onRetry={() => ov.refetch()} />
        )}
      </View>
    );
  }

  const o = ov.data;
  const topSpacesData: TopSpace[] = spaces.data ?? [];
  const topContribData: TopContributor[] = contrib.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ManageHeader
        title="Analytics"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Export analytics"
            onPress={doExport}
            hitSlop={8}
          >
            {exporting ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Download color={colors.accent} size={22} />
            )}
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: spacing[12] }}>
        {/* KPI grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] }}>
          <Kpi label="Posts" value={o?.total_posts} />
          <Kpi label="Replies" value={o?.total_replies} />
          <Kpi label="Members" value={o?.total_members} />
          <Kpi label="Active" value={o?.active_members} />
        </View>

        <Card title="Engagement">
          {eng.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : eng.isError ? (
            <Text style={{ color: colors.textMuted }}>Could not load engagement.</Text>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
              {eng.data?.points.length ?? 0} data points
              {eng.data?.range ? ` · ${eng.data.range.start} → ${eng.data.range.end}` : ''}
            </Text>
          )}
        </Card>

        <Card title="Top spaces">
          {spaces.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : spaces.isError ? (
            <Text style={{ color: colors.textMuted }}>Could not load.</Text>
          ) : topSpacesData.length === 0 ? (
            <Text style={{ color: colors.textMuted }}>No data.</Text>
          ) : (
            topSpacesData.map((s) => (
              <Row key={s.id} label={s.name} value={`${s.post_count} posts`} />
            ))
          )}
        </Card>

        <Card title="Top contributors">
          {contrib.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : contrib.isError ? (
            <Text style={{ color: colors.textMuted }}>Could not load.</Text>
          ) : topContribData.length === 0 ? (
            <Text style={{ color: colors.textMuted }}>No data.</Text>
          ) : (
            topContribData.map((c) => (
              <Row key={c.id} label={c.display_name} value={`${c.post_count + c.reply_count}`} />
            ))
          )}
        </Card>

        <Card title="Moderation">
          {mod.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : mod.isError ? (
            <Text style={{ color: colors.textMuted }}>Could not load.</Text>
          ) : (
            <>
              <Row label="Flags open" value={String(mod.data?.flags_open ?? 0)} />
              <Row label="Flags resolved" value={String(mod.data?.flags_resolved ?? 0)} />
              <Row label="Users banned" value={String(mod.data?.users_banned ?? 0)} />
            </>
          )}
        </Card>

        {/* Advanced disclosure */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle advanced"
          onPress={() => setAdvanced((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingVertical: spacing[2] }}
        >
          {advanced ? (
            <ChevronUp color={colors.textMuted} size={18} />
          ) : (
            <ChevronDown color={colors.textMuted} size={18} />
          )}
          <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>Advanced</Text>
        </Pressable>
        {advanced ? (
          <Card title="Diff report">
            {diff.isLoading ? (
              <ActivityIndicator color={colors.accent} />
            ) : diff.isError ? (
              <Text style={{ color: colors.textMuted }}>
                {isForbidden(diff.error) ? 'Not permitted.' : 'Could not load.'}
              </Text>
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
                {diff.data?.rows.length ?? 0} rows
              </Text>
            )}
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Kpi({ label, value }: { label: string; value?: number }) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: '45%',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing[4],
        gap: 4,
      }}
    >
      <Text style={{ color: colors.text, fontSize: typography.size.xl, fontWeight: typography.weight.bold as '700' }}>
        {value ?? 0}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>{label}</Text>
    </View>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  const { colors, spacing, radius, typography } = useTheme();
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
      <Text style={{ color: colors.text, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[1] }}>
      <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: typography.size.sm }}>
        {label}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>{value}</Text>
    </View>
  );
}
