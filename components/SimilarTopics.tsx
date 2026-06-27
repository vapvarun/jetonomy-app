// components/SimilarTopics.tsx — typeahead list under the compose title.
// Surfaces existing posts that look like duplicates of what the user is writing.

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useSimilarTopics } from '@/hooks/useSearch';
import { useTheme } from '@/theme/ThemeContext';
import type { SearchPostRow } from '@/types/search';

export interface SimilarTopicsProps {
  title: string;
  /** Open in a way that does not lose the draft (default: push detail). */
  onSelect?: (postId: number) => void;
}

export default function SimilarTopics({ title, onSelect }: SimilarTopicsProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { data, isLoading } = useSimilarTopics(title);

  if (title.trim().length < 5) return null;

  const rows: SearchPostRow[] = data ?? [];
  if (!isLoading && rows.length === 0) return null;

  return (
    <View
      style={{
        backgroundColor: colors.bgSubtle,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing[3],
        gap: spacing[2],
      }}
    >
      <Text style={{ color: colors.textMuted, fontSize: typography.size.xs, fontWeight: typography.weight.medium as '500' }}>
        Similar topics
      </Text>
      {isLoading && rows.length === 0 ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : (
        rows.slice(0, 5).map((row) => (
          <Pressable
            key={row.id}
            accessibilityRole="button"
            accessibilityLabel={row.title}
            onPress={() => (onSelect ? onSelect(row.id) : router.push(`/post/${row.id}`))}
            hitSlop={4}
          >
            <Text numberOfLines={1} style={{ color: colors.accent, fontSize: typography.size.sm }}>
              {row.title}
            </Text>
          </Pressable>
        ))
      )}
    </View>
  );
}
