// components/BookmarkButton.tsx — optimistic bookmark toggle.
// Reused inside Content's PostCard/detail and the bookmarks list rows.

import { ActivityIndicator, Pressable } from 'react-native';
import { Bookmark } from 'lucide-react-native';

import { useToggleBookmark } from '@/hooks/useBookmarks';
import { useTheme } from '@/theme/ThemeContext';

export interface BookmarkButtonProps {
  postId: number;
  /** current bookmarked state (list rows lack a flag, so pass it explicitly). */
  bookmarked: boolean;
  size?: number;
}

export default function BookmarkButton({ postId, bookmarked, size = 20 }: BookmarkButtonProps) {
  const { colors, spacing, radius } = useTheme();
  const toggle = useToggleBookmark(postId, bookmarked);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Bookmark'}
      accessibilityState={{ selected: bookmarked, busy: toggle.isPending }}
      onPress={() => toggle.mutate()}
      disabled={toggle.isPending}
      hitSlop={8}
      style={{
        minHeight: 40,
        minWidth: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        padding: spacing[1],
        opacity: toggle.isPending ? 0.6 : 1,
      }}
    >
      {toggle.isPending ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Bookmark
          color={bookmarked ? colors.accent : colors.textMuted}
          fill={bookmarked ? colors.accent : 'transparent'}
          size={size}
        />
      )}
    </Pressable>
  );
}
