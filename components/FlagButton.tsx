// components/FlagButton.tsx — member "report content" action (A5).
//
// Mounted by Content's PostDetail + ReplyItem (02 seam). Opens a reason sheet,
// POSTs a flag (api/flags via useFlag), shows a sticky "Reported" state, and
// disables on repeat. Member-facing: render always, let the server decide —
// a 403 (flagging not allowed) hides the control; 409 (already flagged) is
// treated as success.

import { useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Flag, Check, X } from 'lucide-react-native';

import { useFlag } from '@/hooks/useFlag';
import { useTheme } from '@/theme/ThemeContext';
import type { FlagReason } from '@/types/moderation';

export interface FlagTarget {
  kind: 'post' | 'reply';
  id: number;
}

export interface FlagButtonProps {
  target: FlagTarget;
  /** Optional compact rendering hint for dense list rows. */
  compact?: boolean;
}

const REASONS: Array<{ value: FlagReason; label: string }> = [
  { value: 'spam', label: 'Spam' },
  { value: 'abuse', label: 'Abuse or harassment' },
  { value: 'off_topic', label: 'Off-topic' },
  { value: 'other', label: 'Something else' },
];

export default function FlagButton({ target, compact }: FlagButtonProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FlagReason | null>(null);
  const [note, setNote] = useState('');
  const [reported, setReported] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const flag = useFlag();
  const iconSize = compact ? 16 : 18;

  if (hidden) return null;

  const submit = () => {
    if (!reason) return;
    setErrorMsg(null);
    flag.mutate(
      {
        object_type: target.kind,
        object_id: target.id,
        reason,
        note: note.trim() ? note.trim() : undefined,
      },
      {
        onSuccess: () => {
          setReported(true);
          setOpen(false);
        },
        onError: (err) => {
          if (err.status === 403) {
            // Not allowed to flag → remove the control entirely.
            setHidden(true);
            setOpen(false);
            return;
          }
          setErrorMsg(err.message);
        },
      }
    );
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={reported ? 'Reported' : 'Report content'}
        disabled={reported}
        onPress={() => setOpen(true)}
        hitSlop={10}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[1],
          opacity: reported ? 0.6 : 1,
          paddingVertical: spacing[1],
          paddingHorizontal: compact ? spacing[1] : spacing[2],
        }}
      >
        <Flag
          color={reported ? colors.success : colors.textMuted}
          size={iconSize}
          fill={reported ? colors.success : 'transparent'}
        />
        {!compact ? (
          <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
            {reported ? 'Reported' : 'Report'}
          </Text>
        ) : null}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            // Stop the backdrop press from closing when tapping the sheet.
            onPress={() => {}}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              padding: spacing[4],
              gap: spacing[3],
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: typography.size.lg,
                  fontWeight: typography.weight.semibold as '600',
                }}
              >
                Report this {target.kind}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setOpen(false)}
                hitSlop={10}
              >
                <X color={colors.textMuted} size={22} />
              </Pressable>
            </View>

            <View style={{ gap: spacing[2] }}>
              {REASONS.map((r) => {
                const active = reason === r.value;
                return (
                  <Pressable
                    key={r.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={r.label}
                    onPress={() => setReason(r.value)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderWidth: 1,
                      borderColor: active ? colors.accent : colors.border,
                      borderRadius: radius.md,
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[3],
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: typography.size.base }}>
                      {r.label}
                    </Text>
                    {active ? <Check color={colors.accent} size={18} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              placeholder="Add a note (optional)"
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
              style={{
                minHeight: 64,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing[3],
                color: colors.text,
                textAlignVertical: 'top',
              }}
            />

            {errorMsg ? (
              <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>
                {errorMsg}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Submit report"
              disabled={!reason || flag.isPending}
              onPress={submit}
              style={{
                alignItems: 'center',
                backgroundColor: !reason || flag.isPending ? colors.border : colors.accent,
                borderRadius: radius.md,
                paddingVertical: spacing[3],
              }}
            >
              <Text
                style={{
                  color: !reason ? colors.textMuted : colors.accentFg,
                  fontSize: typography.size.base,
                  fontWeight: typography.weight.semibold as '600',
                }}
              >
                {flag.isPending ? 'Reporting…' : 'Submit report'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
