// components/CustomFieldList.tsx — read-only profile custom fields [PRO].
// Renders a label/value row per non-empty field. Null when features.custom_fields
// is off, so parents mount it unconditionally.

import { Text, View } from 'react-native';

import { useFeatures } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import type { FieldValueMap } from '@/types/customField';

export interface CustomFieldListProps {
  fields: FieldValueMap | undefined;
  isLoading?: boolean;
}

function displayValue(value: string | null, options: unknown[]): string {
  if (value == null || value === '') return '';
  // select fields: value may be an option key; show the label if the option is a {value,label} pair.
  for (const opt of options) {
    if (opt && typeof opt === 'object') {
      const o = opt as { value?: unknown; label?: unknown };
      if (o.value != null && String(o.value) === value && o.label != null) {
        return String(o.label);
      }
    }
  }
  return value;
}

export default function CustomFieldList({ fields, isLoading }: CustomFieldListProps) {
  const { custom_fields: enabled } = useFeatures();
  const { colors, spacing, typography } = useTheme();

  if (!enabled) return null;

  const entries = fields
    ? Object.entries(fields).filter(([, v]) => v && v.value != null && v.value !== '')
    : [];

  if (isLoading) {
    return (
      <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>Loading fields…</Text>
    );
  }
  if (entries.length === 0) return null;

  return (
    <View style={{ gap: spacing[2] }}>
      {entries.map(([slug, v]) => (
        <View key={slug} style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' }}>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.size.sm,
              width: 120,
            }}
            numberOfLines={1}
          >
            {v.name}
          </Text>
          <Text style={{ color: colors.text, fontSize: typography.size.sm, flex: 1 }}>
            {displayValue(v.value, v.options)}
          </Text>
        </View>
      ))}
    </View>
  );
}
