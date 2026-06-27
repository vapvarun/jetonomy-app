// components/ReactionBar.tsx — REAL impl (A4 Pro-social), overwrites the foundation
// null stub. Same mount sites + prop contract as the stub: Content mounts it after
// ContentBody on PostDetail and inside ReplyItem's action row, always, passing
// `target` + an optional `seed`. Self-gates on features.reactions and returns null
// when off — so free builds and flag-off Pro builds stay inert with zero churn.

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SmilePlus } from 'lucide-react-native';

import ReactionPicker from '@/components/ReactionPicker';
import { useReactions } from '@/hooks/useReactions';
import { useFeatures } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import { REACTION_EMOJI, REACTION_ORDER, type ReactionData, type ReactionSlug } from '@/types/reaction';

export interface ReactionTarget {
  kind: 'post' | 'reply';
  id: number;
}

export interface ReactionBarProps {
  target: ReactionTarget;
  /** Inlined summary from Post.reactions / Reply.reactions (narrowed from unknown). */
  seed?: ReactionData | null;
}

export default function ReactionBar({ target, seed }: ReactionBarProps) {
  const { reactions: enabled } = useFeatures();
  const { colors, spacing, radius, typography } = useTheme();
  const { counts, userReactions, busy, toggle } = useReactions(target, seed);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Self-gate: render nothing on free / flag-off builds.
  if (!enabled) return null;

  // Pills for slugs that have at least one reaction, in stable order.
  const activeSlugs = REACTION_ORDER.filter((slug) => (counts[slug] ?? 0) > 0);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[2] }}>
      {activeSlugs.map((slug) => {
        const mine = userReactions.includes(slug);
        const isBusy = busy.has(slug);
        return (
          <Pressable
            key={slug}
            accessibilityRole="button"
            accessibilityLabel={`${slug} reaction`}
            accessibilityState={{ selected: mine }}
            onPress={() => toggle(slug)}
            disabled={isBusy}
            hitSlop={6}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: spacing[2],
              paddingVertical: spacing[1],
              borderRadius: radius.full,
              borderWidth: 1,
              borderColor: mine ? colors.accent : colors.border,
              backgroundColor: mine ? colors.bgSubtle : 'transparent',
              opacity: isBusy ? 0.5 : 1,
            }}
          >
            <Text style={{ fontSize: 14 }}>{REACTION_EMOJI[slug]}</Text>
            <Text
              style={{
                color: mine ? colors.accent : colors.textMuted,
                fontSize: typography.size.xs,
                fontWeight: typography.weight.medium as '500',
              }}
            >
              {counts[slug]}
            </Text>
          </Pressable>
        );
      })}

      {/* Add-reaction button → picker */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add reaction"
        onPress={() => setPickerOpen(true)}
        hitSlop={6}
        style={{
          width: 30,
          height: 28,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SmilePlus color={colors.textMuted} size={16} />
      </Pressable>

      <ReactionPicker
        visible={pickerOpen}
        active={userReactions}
        onPick={(slug: ReactionSlug) => toggle(slug)}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}
