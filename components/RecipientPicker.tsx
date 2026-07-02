// components/RecipientPicker.tsx — debounced (>=3 chars) typeahead over
// recipient-suggestions with multi-select chips. Scope is shared-space members,
// so the empty copy reflects that (not "no users"). Owns its own query; the
// parent owns the selected[] state.

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';

import { recipientSuggestions } from '@/api/conversations';
import Avatar from '@/components/Avatar';
import { useTheme } from '@/theme/ThemeContext';
import type { RecipientSuggestion } from '@/types/conversation';

const MIN_CHARS = 3;

export interface RecipientPickerProps {
  selected: RecipientSuggestion[];
  onChange: (next: RecipientSuggestion[]) => void;
}

export default function RecipientPicker({ selected, onChange }: RecipientPickerProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);

  const enabled = debounced.length >= MIN_CHARS;
  const { data, isFetching, isError } = useQuery({
    queryKey: ['recipient-suggestions', debounced],
    queryFn: () => recipientSuggestions(debounced),
    enabled,
    staleTime: 30_000,
  });

  const selectedIds = new Set(selected.map((s) => s.id));
  const results = (data ?? []).filter((r: RecipientSuggestion) => !selectedIds.has(r.id));

  function add(r: RecipientSuggestion) {
    onChange([...selected, r]);
    setText('');
    setDebounced('');
  }
  function remove(id: number) {
    onChange(selected.filter((s) => s.id !== id));
  }

  return (
    <View style={{ gap: spacing[2] }}>
      {/* Selected chips */}
      {selected.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          {selected.map((r) => (
            <View
              key={r.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: colors.bgSubtle,
                borderRadius: radius.full,
                paddingLeft: spacing[2],
                paddingRight: spacing[1],
                paddingVertical: spacing[1],
              }}
            >
              <Text style={{ color: colors.text, fontSize: typography.size.sm }}>{r.display_name}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${r.display_name}`}
                onPress={() => remove(r.id)}
                hitSlop={8}
              >
                <X color={colors.textMuted} size={14} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Search members…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        style={{
          backgroundColor: colors.bgSubtle,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[3],
          color: colors.text,
          fontSize: typography.size.base,
        }}
      />

      {/* Suggestion states */}
      {text.trim().length > 0 && text.trim().length < MIN_CHARS ? (
        <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
          Type at least {MIN_CHARS} characters.
        </Text>
      ) : null}

      {enabled && isFetching ? (
        <View style={{ paddingVertical: spacing[3], alignItems: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}

      {enabled && isError ? (
        <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>
          Could not search members. Try again.
        </Text>
      ) : null}

      {enabled && !isFetching && !isError && results.length === 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: typography.size.sm, paddingVertical: spacing[2] }}>
          No members found in your shared spaces.
        </Text>
      ) : null}

      {results.length > 0 ? (
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' }}>
          <FlatList
            data={results}
            keyExtractor={(r) => String(r.id)}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.display_name}`}
                onPress={() => add(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[3],
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[2],
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <Avatar uri={item.avatar_url} name={item.display_name} size={32} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: typography.size.sm, fontWeight: typography.weight.medium as '500' }}>
                    {item.display_name}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
                    @{item.user_login}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      ) : null}
    </View>
  );
}
