// components/JoinLeaveButton.tsx — join/leave state machine off join_policy +
// derived membership (gotcha #1, #9). Pending (202) ≠ joined.

import { useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { useJoinSpace, useLeaveSpace, useMyMembership } from '@/hooks/useSpaces';
import { useCurrentUser } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import type { Space } from '@/types/space';

export interface JoinLeaveButtonProps {
  space: Space;
}

export default function JoinLeaveButton({ space }: JoinLeaveButtonProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const me = useCurrentUser();
  const membership = useMyMembership(space.id);
  const join = useJoinSpace(space.id);
  const leave = useLeaveSpace(space.id);

  // Local pending overlay for the 202 "awaiting approval" outcome (no member flip).
  const [pending, setPending] = useState(false);

  const busy = join.isPending || leave.isPending || membership.isResolving;

  function handleJoin() {
    join.mutate(undefined, {
      onSuccess: (res) => {
        if (res.status === 'pending') setPending(true);
      },
      onError: () => {
        // 409 already-member resolves via invalidation; nothing else to do.
      },
    });
  }

  function handleLeave() {
    if (me?.user_id == null) return;
    leave.mutate(me.user_id);
  }

  const label = (() => {
    if (membership.isMember) return 'Leave';
    if (pending) return 'Awaiting approval';
    if (space.join_policy === 'invite') return 'Invite only';
    if (space.join_policy === 'approval') return 'Request to join';
    return 'Join';
  })();

  const disabled = busy || pending || (!membership.isMember && space.join_policy === 'invite');
  const isPrimary = !membership.isMember && !pending && space.join_policy !== 'invite';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={membership.isMember ? handleLeave : handleJoin}
      style={{
        minHeight: 40,
        paddingHorizontal: spacing[4],
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing[2],
        backgroundColor: isPrimary ? colors.accent : colors.bgSubtle,
        borderWidth: isPrimary ? 0 : 1,
        borderColor: colors.border,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {busy ? <ActivityIndicator size="small" color={isPrimary ? colors.accentFg : colors.text} /> : null}
      <Text
        style={{
          color: isPrimary ? colors.accentFg : membership.isMember ? colors.danger : colors.text,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.semibold as '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
