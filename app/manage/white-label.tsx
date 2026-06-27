// app/manage/white-label.tsx — white-label settings (Pro; manage_options).

import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { get, update } from '@/api/whiteLabel';
import type { ApiError } from '@/api/client';
import type { UpdateWhiteLabelBody, WhiteLabelSettings } from '@/types/whiteLabel';
import { useTheme } from '@/theme/ThemeContext';
import {
  ManageHeader,
  LoadingState,
  ForbiddenState,
  ErrorState,
  isForbidden,
} from '@/components/manage/ManageStates';

export default function WhiteLabelScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const qc = useQueryClient();

  const q = useQuery<WhiteLabelSettings, ApiError>({
    queryKey: ['white-label'],
    queryFn: get,
  });

  const [form, setForm] = useState<UpdateWhiteLabelBody>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (q.data) {
      setForm({
        brand_name: q.data.brand_name,
        logo_url: q.data.logo_url ?? '',
        accent_color: q.data.accent_color,
        custom_css: q.data.custom_css,
        footer_html: q.data.footer_html,
      });
    }
  }, [q.data]);

  const save = useMutation<WhiteLabelSettings, ApiError, UpdateWhiteLabelBody>({
    mutationFn: update,
    onSuccess: () => {
      setSaved(true);
      void qc.invalidateQueries({ queryKey: ['white-label'] });
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (q.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="White-label" />
        <LoadingState />
      </View>
    );
  }
  if (q.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="White-label" />
        {isForbidden(q.error) ? (
          <ForbiddenState message="Admin access required." />
        ) : (
          <ErrorState message={q.error?.message} onRetry={() => q.refetch()} />
        )}
      </View>
    );
  }

  const set = (k: keyof UpdateWhiteLabelBody, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ManageHeader title="White-label" />
      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: spacing[12] }}>
        <LabeledInput label="Brand name" value={String(form.brand_name ?? '')} onChangeText={(v) => set('brand_name', v)} />
        <LabeledInput
          label="Logo URL"
          value={String(form.logo_url ?? '')}
          onChangeText={(v) => set('logo_url', v)}
          autoCapitalize="none"
        />
        <LabeledInput
          label="Accent color"
          value={String(form.accent_color ?? '')}
          onChangeText={(v) => set('accent_color', v)}
          autoCapitalize="none"
          placeholder="#3B82F6"
        />
        <LabeledInput
          label="Custom CSS"
          value={String(form.custom_css ?? '')}
          onChangeText={(v) => set('custom_css', v)}
          autoCapitalize="none"
          multiline
        />
        <LabeledInput
          label="Footer HTML"
          value={String(form.footer_html ?? '')}
          onChangeText={(v) => set('footer_html', v)}
          autoCapitalize="none"
          multiline
        />

        {save.isError ? (
          <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>
            {save.error?.message ?? 'Could not save.'}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save white-label settings"
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

function LabeledInput({
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
