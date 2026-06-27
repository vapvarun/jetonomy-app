// components/PollView.tsx — REAL impl (A4 Pro-social), overwrites the foundation
// null stub. Mounted unconditionally by PostDetail after ContentBody, passing
// `postId` + an optional `seed` (Post.poll). Self-gates on features.polls and
// returns null when off OR when the post has no poll. Pre-vote rows are tappable;
// post-vote / closed rows become result bars with percentage + counts.

import { Pressable, Text, View } from 'react-native';
import { CheckCircle2, Circle, CheckSquare, Square, Lock } from 'lucide-react-native';

import { usePoll } from '@/hooks/usePoll';
import { useCurrentUser, useFeatures } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import { relativeTime } from '@/utils/date';
import type { Poll, PollOption } from '@/types/poll';

export interface PollViewProps {
  postId: number;
  /** Inlined poll from Post.poll (narrowed from unknown). */
  seed?: Poll | null;
}

export default function PollView({ postId, seed }: PollViewProps) {
  const { polls: enabled } = useFeatures();
  const me = useCurrentUser();
  const { colors, spacing, radius, typography } = useTheme();
  const { poll, loading, pending, error, castVote, retract, setClose } = usePoll(
    postId,
    seed
  );

  if (!enabled) return null;
  if (loading) {
    return (
      <View
        style={{
          height: 120,
          borderRadius: radius.md,
          backgroundColor: colors.bgSubtle,
        }}
      />
    );
  }
  if (!poll) return null; // no poll on this post

  const hasVoted = poll.user_votes.length > 0;
  const showResults = hasVoted || poll.closed;
  const isAuthor = !!me && poll.created_by === me.user_id;

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing[4],
        gap: spacing[3],
        marginTop: spacing[2],
      }}
    >
      {/* Question + status */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <Text
          style={{
            flex: 1,
            color: colors.text,
            fontSize: typography.size.base,
            fontWeight: typography.weight.semibold as '600',
          }}
        >
          {poll.question}
        </Text>
        {poll.closed ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: colors.bgSubtle,
              borderRadius: radius.sm,
              paddingHorizontal: spacing[2],
              paddingVertical: 2,
            }}
          >
            <Lock color={colors.textMuted} size={12} />
            <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>Closed</Text>
          </View>
        ) : null}
      </View>

      {/* Options */}
      <View style={{ gap: spacing[2] }}>
        {poll.options.map((opt) => (
          <PollOptionRow
            key={opt.id}
            option={opt}
            type={poll.type}
            selected={poll.user_votes.includes(opt.id)}
            showResults={showResults}
            disabled={poll.closed || pending}
            onPress={() => castVote(opt.id)}
          />
        ))}
      </View>

      {/* Footer: voters + multiple hint + closes_at */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' }}>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
          {poll.total_voters} {poll.total_voters === 1 ? 'voter' : 'voters'}
        </Text>
        {poll.type === 'multiple' ? (
          <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>· Choose multiple</Text>
        ) : null}
        {!poll.closed && poll.closes_at ? (
          <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
            · Closes {relativeTime(poll.closes_at)}
          </Text>
        ) : null}
      </View>

      {error ? (
        <Text style={{ color: colors.danger, fontSize: typography.size.xs }}>{error}</Text>
      ) : null}

      {/* Actions: retract (voter) + close/reopen (author) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
        {hasVoted && !poll.closed ? (
          <Pressable accessibilityRole="button" onPress={retract} disabled={pending} hitSlop={8}>
            <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>Retract vote</Text>
          </Pressable>
        ) : null}
        {isAuthor ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setClose(!poll.closed)}
            disabled={pending}
            hitSlop={8}
          >
            <Text style={{ color: colors.accent, fontSize: typography.size.sm }}>
              {poll.closed ? 'Reopen poll' : 'Close poll'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PollOptionRow({
  option,
  type,
  selected,
  showResults,
  disabled,
  onPress,
}: {
  option: PollOption;
  type: Poll['type'];
  selected: boolean;
  showResults: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const Icon = type === 'multiple'
    ? selected
      ? CheckSquare
      : Square
    : selected
      ? CheckCircle2
      : Circle;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={option.label}
      onPress={onPress}
      disabled={disabled}
      style={{
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
        borderRadius: radius.md,
        overflow: 'hidden',
      }}
    >
      {/* Result fill bar */}
      {showResults ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.max(0, Math.min(100, option.percentage))}%`,
            backgroundColor: selected ? colors.accent : colors.bgSubtle,
            opacity: selected ? 0.18 : 1,
          }}
        />
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
        }}
      >
        <Icon color={selected ? colors.accent : colors.textMuted} size={18} />
        <Text style={{ flex: 1, color: colors.text, fontSize: typography.size.sm }} numberOfLines={2}>
          {option.label}
        </Text>
        {showResults ? (
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.size.xs,
              fontWeight: typography.weight.medium as '500',
            }}
          >
            {option.percentage}% · {option.vote_count}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
