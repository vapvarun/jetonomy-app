// app/search.tsx — full-text search. type=all renders grouped Posts/Spaces/Tags;
// typed filters render a single list. Search rows are raw/un-enriched — tapping a
// post opens the detail screen which fetches the full enriched Post.

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import SearchBar from '@/components/SearchBar';
import TagChip from '@/components/TagChip';
import { useSearch, useSearchAll } from '@/hooks/useSearch';
import { useTheme } from '@/theme/ThemeContext';
import { stripHtml } from '@/utils/html';
import type {
  SearchPostRow,
  SearchSpaceRow,
  SearchTagRow,
  SearchType,
} from '@/types/search';

export default function SearchScreen() {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchType>('all');

  const onChange = useCallback((q: string) => setQuery(q), []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: insets.top + spacing[3],
          paddingHorizontal: spacing[4],
          paddingBottom: spacing[3],
          gap: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Text style={{ color: colors.text, fontSize: typography.size['2xl'], fontWeight: typography.weight.bold as '700' }}>Search</Text>
        <SearchBar onChange={onChange} type={type} onTypeChange={setType} autoFocus placeholder="Search posts, spaces, tags…" />
      </View>

      {query.trim().length < 2 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] }}>
          <Text style={{ color: colors.textMuted, fontSize: typography.size.base, textAlign: 'center' }}>
            Type at least 2 characters to search.
          </Text>
        </View>
      ) : type === 'all' ? (
        <AllResults query={query} />
      ) : (
        <TypedResults query={query} type={type} />
      )}
    </View>
  );
}

function AllResults({ query }: { query: string }) {
  const { colors, spacing, typography } = useTheme();
  const { data, isLoading, isError } = useSearchAll({ q: query });

  if (isLoading) return <Centered><ActivityIndicator color={colors.accent} /></Centered>;
  if (isError) return <Centered><Text style={{ color: colors.text }}>Search failed.</Text></Centered>;

  const posts: SearchPostRow[] = data?.data.posts ?? [];
  const spaces: SearchSpaceRow[] = data?.data.spaces ?? [];
  const tags: SearchTagRow[] = data?.data.tags ?? [];
  const empty = posts.length + spaces.length + tags.length === 0;
  if (empty) return <Centered><Text style={{ color: colors.textMuted }}>No results for “{query}”.</Text></Centered>;

  return (
    <FlatList
      data={[0]}
      keyExtractor={() => 'all'}
      contentContainerStyle={{ padding: spacing[4], gap: spacing[5] }}
      renderItem={() => (
        <View style={{ gap: spacing[5] }}>
          {posts.length ? (
            <Section title="Posts">
              {posts.map((p) => (
                <PostResult key={`p-${p.id}`} row={p} />
              ))}
            </Section>
          ) : null}
          {spaces.length ? (
            <Section title="Spaces">
              {spaces.map((s) => (
                <SpaceResult key={`s-${s.id}`} row={s} />
              ))}
            </Section>
          ) : null}
          {tags.length ? (
            <Section title="Tags">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
                {tags.map((t) => (
                  <TagChip key={`t-${t.id}`} tag={t} />
                ))}
              </View>
            </Section>
          ) : null}
        </View>
      )}
    />
  );

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View style={{ gap: spacing[2] }}>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.sm, fontWeight: typography.weight.semibold as '600' }}>{title}</Text>
        {children}
      </View>
    );
  }
}

function TypedResults({ query, type }: { query: string; type: SearchType }) {
  const { colors, spacing } = useTheme();
  const { data, isLoading, isError } = useSearch({ q: query, type });

  if (isLoading) return <Centered><ActivityIndicator color={colors.accent} /></Centered>;
  if (isError) return <Centered><Text style={{ color: colors.text }}>Search failed.</Text></Centered>;

  const rows = data?.data ?? [];
  if (rows.length === 0) return <Centered><Text style={{ color: colors.textMuted }}>No results.</Text></Centered>;

  return (
    <FlatList
      data={rows}
      keyExtractor={(r, i) => `${(r as { id?: number }).id ?? i}`}
      contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}
      renderItem={({ item }) => {
        if (type === 'space') return <SpaceResult row={item as SearchSpaceRow} />;
        if (type === 'tag') return <TagChip tag={item as SearchTagRow} />;
        return <PostResult row={item as SearchPostRow} />;
      }}
    />
  );
}

function PostResult({ row }: { row: SearchPostRow }) {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.title}
      onPress={() => router.push(`/post/${row.id}`)}
      style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing[3], gap: spacing[1] }}
    >
      <Text numberOfLines={2} style={{ color: colors.text, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>{row.title}</Text>
      <Text numberOfLines={2} style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
        {row.content_plain || stripHtml(row.content, 120)}
      </Text>
      {row.space_title ? (
        <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>{row.space_title}</Text>
      ) : null}
    </Pressable>
  );
}

function SpaceResult({ row }: { row: SearchSpaceRow }) {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.title}
      onPress={() => router.push('/spaces')}
      style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing[3], gap: spacing[1] }}
    >
      <Text numberOfLines={1} style={{ color: colors.text, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>{row.title}</Text>
      {row.description ? (
        <Text numberOfLines={2} style={{ color: colors.textMuted, fontSize: typography.size.sm }}>{stripHtml(row.description, 120)}</Text>
      ) : null}
    </Pressable>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  const { spacing } = useTheme();
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] }}>{children}</View>;
}
