// app/tag/[tag].tsx — posts for a tag, via /search?type=post&tag=<slug>
// (single ranked page; no infinite scroll on search).

import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { useSearch } from '@/hooks/useSearch';
import { useTheme } from '@/theme/ThemeContext';
import { stripHtml } from '@/utils/html';
import type { SearchPostRow, SearchSort } from '@/types/search';

const SORTS: { key: SearchSort; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'votes', label: 'Top' },
  { key: 'relevance', label: 'Relevant' },
];

export default function TagScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const slug = String(tag ?? '');
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [sort, setSort] = useState<SearchSort>('newest');
  // Tag listing uses the tag slug as the query seed + the tag filter.
  const { data, isLoading, isError, refetch } = useSearch({ q: slug, type: 'post', tag: slug, sort });
  const rows = (data?.data ?? []) as SearchPostRow[];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[3],
          paddingBottom: spacing[3],
          gap: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft color={colors.text} size={24} />
          </Pressable>
          <Text style={{ color: colors.text, fontSize: typography.size.xl, fontWeight: typography.weight.bold as '700' }}>#{slug}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          {SORTS.map((s) => {
            const active = s.key === sort;
            return (
              <Pressable
                key={s.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSort(s.key)}
                style={{ paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.full, backgroundColor: active ? colors.accent : colors.bgSubtle, borderWidth: 1, borderColor: active ? colors.accent : colors.border }}
              >
                <Text style={{ color: active ? colors.accentFg : colors.textMuted, fontSize: typography.size.sm }}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
          <Text style={{ color: colors.text }}>Could not load posts.</Text>
          <Pressable onPress={() => refetch()} accessibilityRole="button">
            <Text style={{ color: colors.accent }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: insets.bottom + spacing[8] }}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => router.push(`/post/${item.id}`)}
              style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing[3], gap: spacing[1] }}
            >
              <Text numberOfLines={2} style={{ color: colors.text, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>{item.title}</Text>
              <Text numberOfLines={2} style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
                {item.content_plain || stripHtml(item.content, 120)}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: spacing[12] }}>
              <Text style={{ color: colors.textMuted }}>No posts with this tag.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
