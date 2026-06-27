// components/VoteButton.tsx — optimistic up/down control via useVote.
// Self-downvote (400) rolls back and surfaces the server message inline.

import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

import { useVote, type VoteKind, type VoteValue } from '@/hooks/useVotes';
import { useTheme } from '@/theme/ThemeContext';

export interface VoteButtonProps {
  kind: VoteKind;
  id: number;
  score: number;
  /** Viewer's current value seed (post.viewer_vote / reply.viewer_vote). */
  userValue?: VoteValue;
  /** Horizontal layout for inline reply rows; vertical for post header. */
  horizontal?: boolean;
  onError?: (message: string) => void;
}

export default function VoteButton({
  kind,
  id,
  score,
  userValue = 0,
  horizontal = false,
  onError,
}: VoteButtonProps) {
  const { colors, spacing, typography } = useTheme();
  const { value, score: liveScore, pending, error, vote } = useVote({
    kind,
    id,
    seedValue: userValue,
    seedScore: score,
  });

  useEffect(() => {
    if (error && onError) onError(error);
  }, [error, onError]);

  const upColor = value === 1 ? colors.accent : colors.textMuted;
  const downColor = value === -1 ? colors.danger : colors.textMuted;

  const press = (dir: 1 | -1) => {
    const next: VoteValue = value === dir ? 0 : dir;
    vote(next);
  };

  const Container = View;
  return (
    <Container
      style={{
        flexDirection: horizontal ? 'row' : 'column',
        alignItems: 'center',
        gap: spacing[1],
        opacity: pending ? 0.6 : 1,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Upvote"
        accessibilityState={{ selected: value === 1 }}
        onPress={() => press(1)}
        hitSlop={10}
      >
        <ChevronUp color={upColor} size={22} />
      </Pressable>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.semibold as '600',
          minWidth: 20,
          textAlign: 'center',
        }}
      >
        {liveScore}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Downvote"
        accessibilityState={{ selected: value === -1 }}
        onPress={() => press(-1)}
        hitSlop={10}
      >
        <ChevronDown color={downColor} size={22} />
      </Pressable>
    </Container>
  );
}
