// components/SearchBar.tsx — debounced query input + type filter chips.
// Holds raw keystrokes locally and emits a 300ms-debounced value to the parent,
// which feeds useSearch.

import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeContext';
import type { SearchType } from '@/types/search';

const TYPE_OPTIONS: { key: SearchType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'post', label: 'Posts' },
  { key: 'space', label: 'Spaces' },
  { key: 'tag', label: 'Tags' },
];

export interface SearchBarProps {
  /** Debounced output (committed query). */
  onChange: (q: string) => void;
  type?: SearchType;
  onTypeChange?: (t: SearchType) => void;
  showTypeFilter?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  initialValue?: string;
  debounceMs?: number;
}

export default function SearchBar({
  onChange,
  type,
  onTypeChange,
  showTypeFilter = true,
  placeholder = 'Search…',
  autoFocus = false,
  initialValue = '',
  debounceMs = 300,
}: SearchBarProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const [input, setInput] = useState(initialValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(input.trim()), debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // onChange is expected stable (useCallback) from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, debounceMs]);

  return (
    <View style={{ gap: spacing[3] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
          backgroundColor: colors.bgSubtle,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingHorizontal: spacing[3],
        }}
      >
        <Search color={colors.textMuted} size={18} />
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          returnKeyType="search"
          onSubmitEditing={() => onChange(input.trim())}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: typography.size.base,
            paddingVertical: spacing[3],
          }}
        />
        {input.length > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setInput('')} hitSlop={8}>
            <X color={colors.textMuted} size={18} />
          </Pressable>
        ) : null}
      </View>

      {showTypeFilter && onTypeChange ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
          {TYPE_OPTIONS.map((opt) => {
            const active = (type ?? 'all') === opt.key;
            return (
              <Pressable
                key={opt.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => onTypeChange(opt.key)}
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
                    color: active ? colors.accentFg : colors.textMuted,
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.medium as '500',
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}
