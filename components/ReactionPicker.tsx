// components/ReactionPicker.tsx — popover of the 8 reaction slugs. Picking one
// delegates to the caller's toggle(slug); the bottom sheet then closes. Pure UI —
// no data/gating of its own (ReactionBar owns both).

import { Modal, Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';
import { REACTION_EMOJI, REACTION_ORDER, type ReactionSlug } from '@/types/reaction';

export interface ReactionPickerProps {
  visible: boolean;
  /** Slugs already active for the caller — shown highlighted. */
  active?: ReactionSlug[];
  onPick: (slug: ReactionSlug) => void;
  onClose: () => void;
}

export default function ReactionPicker({
  visible,
  active = [],
  onPick,
  onClose,
}: ReactionPickerProps) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close reactions"
      >
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: spacing[4],
            gap: spacing[3],
          }}
        >
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.size.xs,
              fontWeight: typography.weight.medium as '500',
            }}
          >
            React
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
            {REACTION_ORDER.map((slug) => {
              const isActive = active.includes(slug);
              return (
                <Pressable
                  key={slug}
                  accessibilityRole="button"
                  accessibilityLabel={slug}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => {
                    onPick(slug);
                    onClose();
                  }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: isActive ? colors.accent : colors.border,
                    backgroundColor: isActive ? colors.bgSubtle : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{REACTION_EMOJI[slug]}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
