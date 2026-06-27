// app/manage/recount.tsx — site maintenance (free admin; manage_options).
//
// Three tools: rebuild denormalized counts, bulk-set trust levels, and the
// admin email-digest card (send test + stats — api/digest-admin.ts). 403 on any
// call → ForbiddenState for that action.

import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { RefreshCw, Users, Mail } from 'lucide-react-native';

import { recount, setTrustLevel } from '@/api/admin';
import { sendTest, getStats } from '@/api/digest-admin';
import type { ApiError } from '@/api/client';
import type { RecountResult, TrustLevelResult } from '@/types/admin';
import type { DigestStats } from '@/types/digest';
import { useTheme } from '@/theme/ThemeContext';
import { ManageHeader } from '@/components/manage/ManageStates';

export default function MaintenanceScreen() {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ManageHeader title="Maintenance" />
      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: spacing[12] }}>
        <RecountCard />
        <TrustLevelCard />
        <DigestCard />
      </ScrollView>
    </View>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof RefreshCw;
  title: string;
  children: ReactNode;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing[4],
        gap: spacing[3],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <Icon color={colors.accent} size={18} />
        <Text style={{ color: colors.text, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function PrimaryButton({
  label,
  pending,
  disabled,
  onPress,
}: {
  label: string;
  pending?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || pending}
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: disabled || pending ? colors.border : colors.accent,
        borderRadius: radius.md,
        paddingVertical: spacing[3],
      }}
    >
      <Text style={{ color: colors.accentFg, fontWeight: typography.weight.semibold as '600' }}>
        {pending ? 'Working…' : label}
      </Text>
    </Pressable>
  );
}

function RecountCard() {
  const { colors, spacing, typography } = useTheme();
  const m = useMutation<RecountResult, ApiError, void>({
    mutationFn: () => recount({}),
  });
  return (
    <Card icon={RefreshCw} title="Rebuild counts">
      <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
        Recalculate post/reply/vote counters. Safe to run anytime; may take a while.
      </Text>
      <PrimaryButton label="Run recount" pending={m.isPending} onPress={() => m.mutate()} />
      {m.isError ? (
        <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>
          {m.error?.status === 403 ? 'Admin access required.' : m.error?.message}
        </Text>
      ) : null}
      {m.isSuccess ? (
        <Text style={{ color: colors.success, fontSize: typography.size.sm }}>
          {m.data?.message ?? 'Counts rebuilt.'}
        </Text>
      ) : null}
    </Card>
  );
}

function TrustLevelCard() {
  const { colors, spacing, radius, typography } = useTheme();
  const [ids, setIds] = useState('');
  const [level, setLevel] = useState('1');

  const m = useMutation<TrustLevelResult, ApiError, void>({
    mutationFn: () =>
      setTrustLevel({
        user_ids: ids
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0),
        trust_level: Number(level) || 0,
      }),
  });

  const parsedIds = ids
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  return (
    <Card icon={Users} title="Set trust levels">
      <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
        Bulk-assign a trust level to user ids (comma-separated).
      </Text>
      <TextInput
        value={ids}
        onChangeText={setIds}
        placeholder="e.g. 12, 34, 56"
        placeholderTextColor={colors.textMuted}
        keyboardType="numbers-and-punctuation"
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing[3],
          color: colors.text,
        }}
      />
      <TextInput
        value={level}
        onChangeText={setLevel}
        placeholder="Trust level (0-4)"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing[3],
          color: colors.text,
        }}
      />
      <PrimaryButton
        label="Apply trust level"
        pending={m.isPending}
        disabled={parsedIds.length === 0}
        onPress={() => m.mutate()}
      />
      {m.isError ? (
        <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>
          {m.error?.status === 403 ? 'Admin access required.' : m.error?.message}
        </Text>
      ) : null}
      {m.isSuccess ? (
        <Text style={{ color: colors.success, fontSize: typography.size.sm }}>
          Updated {m.data?.updated ?? 0} user(s).
        </Text>
      ) : null}
    </Card>
  );
}

function DigestCard() {
  const { colors, spacing, typography } = useTheme();

  const stats = useQuery<DigestStats, ApiError>({
    queryKey: ['digest', 'stats'],
    queryFn: getStats,
    retry: false,
  });

  const test = useMutation<{ sent: boolean; message?: string }, ApiError, void>({
    mutationFn: () => sendTest({}),
  });

  return (
    <Card icon={Mail} title="Email digest">
      {stats.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : stats.isError ? (
        <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
          {stats.error?.status === 403 ? 'Admin access required.' : 'Digest stats unavailable.'}
        </Text>
      ) : (
        <View style={{ gap: spacing[1] }}>
          <Text style={{ color: colors.text, fontSize: typography.size.sm }}>
            {stats.data?.subscribers ?? 0} subscribers
          </Text>
          {stats.data?.last_sent_at ? (
            <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
              Last sent {stats.data.last_sent_at}
            </Text>
          ) : null}
        </View>
      )}
      <PrimaryButton label="Send test digest" pending={test.isPending} onPress={() => test.mutate()} />
      {test.isError ? (
        <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>
          {test.error?.status === 403 ? 'Admin access required.' : test.error?.message}
        </Text>
      ) : null}
      {test.isSuccess ? (
        <Text style={{ color: colors.success, fontSize: typography.size.sm }}>
          {test.data?.message ?? 'Test digest sent.'}
        </Text>
      ) : null}
    </Card>
  );
}
