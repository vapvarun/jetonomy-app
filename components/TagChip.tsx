// components/TagChip.tsx — tag pill linking to app/tag/[tag].

import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeContext';
import type { Tag } from '@/types/tag';

export interface TagChipProps {
  tag: Pick<Tag, 'name' | 'slug'> & { post_count?: number };
  /** Disable navigation (e.g. inside the compose tag editor). */
  onPress?: () => void;
}

export default function TagChip({ tag, onPress }: TagChipProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Tag ${tag.name}`}
      onPress={onPress ?? (() => router.push(`/tag/${tag.slug}`))}
      hitSlop={6}
      style={{
        backgroundColor: colors.bgSubtle,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.full,
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1],
      }}
    >
      <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
        #{tag.name}
        {typeof tag.post_count === 'number' ? `  ${tag.post_count}` : ''}
      </Text>
    </Pressable>
  );
}
