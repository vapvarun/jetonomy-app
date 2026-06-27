// app/manage/seo.tsx — per-space SEO editor (Pro seo-pro; jetonomy_manage_spaces).
//
// Space-scoped: a 403 means "you don't manage THIS space". Pick a space id (or
// arrive with ?spaceId=N), then edit title/description/og image/canonical/robots.

import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSpaceSeo, updateSpaceSeo } from '@/api/seo';
import type { ApiError } from '@/api/client';
import type { SpaceSeo, UpdateSpaceSeoBody } from '@/types/seo';
import { useTheme } from '@/theme/ThemeContext';
import {
  ManageHeader,
  LoadingState,
  ForbiddenState,
  ErrorState,
  isForbidden,
} from '@/components/manage/ManageStates';

export default function SeoScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const params = useLocalSearchParams<{ spaceId?: string }>();
  const initial = Number(params.spaceId ?? 0) || 0;
  const [spaceId, setSpaceId] = useState(initial);
  const [idInput, setIdInput] = useState(initial ? String(initial) : '');

  if (spaceId <= 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="Space SEO" />
        <View style={{ padding: spacing[4], gap: spacing[3] }}>
          <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
            Enter the id of a space you manage.
          </Text>
          <TextInput
            value={idInput}
            onChangeText={setIdInput}
            placeholder="Space id"
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open space SEO"
            disabled={!Number(idInput)}
            onPress={() => setSpaceId(Number(idInput))}
            style={{
              alignItems: 'center',
              backgroundColor: Number(idInput) ? colors.accent : colors.border,
              borderRadius: radius.md,
              paddingVertical: spacing[3],
            }}
          >
            <Text style={{ color: colors.accentFg, fontWeight: typography.weight.semibold as '600' }}>Open</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return <SeoForm spaceId={spaceId} key={spaceId} />;
}

function SeoForm({ spaceId }: { spaceId: number }) {
  const { colors, spacing, radius, typography } = useTheme();
  const qc = useQueryClient();

  const q = useQuery<SpaceSeo, ApiError>({
    queryKey: ['space-seo', spaceId],
    queryFn: () => getSpaceSeo(spaceId),
  });

  const [form, setForm] = useState<UpdateSpaceSeoBody>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (q.data) {
      setForm({
        title: q.data.title,
        description: q.data.description,
        og_image: q.data.og_image ?? '',
        canonical: q.data.canonical,
        robots: q.data.robots,
      });
    }
  }, [q.data]);

  const save = useMutation<SpaceSeo, ApiError, UpdateSpaceSeoBody>({
    mutationFn: (body) => updateSpaceSeo(spaceId, body),
    onSuccess: () => {
      setSaved(true);
      void qc.invalidateQueries({ queryKey: ['space-seo', spaceId] });
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (q.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title={`SEO · Space #${spaceId}`} />
        <LoadingState />
      </View>
    );
  }
  if (q.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title={`SEO · Space #${spaceId}`} />
        {isForbidden(q.error) ? (
          <ForbiddenState message="You don't manage this space." />
        ) : (
          <ErrorState message={q.error?.message} onRetry={() => q.refetch()} />
        )}
      </View>
    );
  }

  const set = (k: keyof UpdateSpaceSeoBody, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ManageHeader title={`SEO · Space #${spaceId}`} />
      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: spacing[12] }}>
        <Labeled label="Title" value={String(form.title ?? '')} onChangeText={(v) => set('title', v)} />
        <Labeled label="Description" value={String(form.description ?? '')} onChangeText={(v) => set('description', v)} multiline />
        <Labeled
          label="OG image URL"
          value={String(form.og_image ?? '')}
          onChangeText={(v) => set('og_image', v)}
          autoCapitalize="none"
        />
        <Labeled
          label="Canonical URL"
          value={String(form.canonical ?? '')}
          onChangeText={(v) => set('canonical', v)}
          autoCapitalize="none"
        />
        <Labeled
          label="Robots"
          value={String(form.robots ?? '')}
          onChangeText={(v) => set('robots', v)}
          autoCapitalize="none"
          placeholder="index, follow"
        />

        {save.isError ? (
          <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>
            {save.error?.message ?? 'Could not save.'}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save SEO"
          disabled={save.isPending}
          onPress={() => save.mutate(form)}
          style={{
            alignItems: 'center',
            backgroundColor: saved ? colors.success : colors.accent,
            borderRadius: radius.md,
            paddingVertical: spacing[3],
          }}
        >
          <Text style={{ color: colors.accentFg, fontWeight: typography.weight.semibold as '600' }}>
            {save.isPending ? 'Saving…' : saved ? 'Saved' : 'Save'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Labeled({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences';
  multiline?: boolean;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <View style={{ gap: spacing[1] }}>
      <Text style={{ color: colors.textMuted, fontSize: typography.size.xs, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing[3],
          color: colors.text,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}
