// components/MemberRow.tsx — one member row with role badge + admin action menu.

import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';

import Avatar from '@/components/Avatar';
import { useTheme } from '@/theme/ThemeContext';
import type { SpaceMember, SpaceRole } from '@/types/space';

const ROLE_ORDER: SpaceRole[] = ['member', 'moderator', 'admin'];
const ROLE_LABELS: Record<SpaceRole, string> = {
  viewer: 'Viewer',
  member: 'Member',
  moderator: 'Moderator',
  admin: 'Admin',
};

export interface MemberRowProps {
  member: SpaceMember;
  /** Viewer is a space admin → show the action menu. */
  canManage?: boolean;
  /** Don't offer actions on yourself's row for role changes. */
  isSelf?: boolean;
  busy?: boolean;
  onChangeRole?: (role: SpaceRole) => void;
  onKick?: () => void;
}

export default function MemberRow({
  member,
  canManage = false,
  isSelf = false,
  busy = false,
  onChangeRole,
  onKick,
}: MemberRowProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const [menu, setMenu] = useState(false);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        paddingVertical: spacing[2],
      }}
    >
      <Avatar uri={member.avatar_url} name={member.display_name} size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: typography.size.sm, fontWeight: typography.weight.medium as '500' }}>
          {member.display_name}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
          Trust {member.trust_level} · {member.reputation} rep
        </Text>
      </View>

      <RoleBadge role={member.role} />

      {canManage ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Manage ${member.display_name}`}
          onPress={() => setMenu(true)}
          disabled={busy}
          hitSlop={8}
          style={{ opacity: busy ? 0.5 : 1, padding: spacing[1] }}
        >
          <MoreHorizontal color={colors.textMuted} size={20} />
        </Pressable>
      ) : null}

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
          onPress={() => setMenu(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              padding: spacing[4],
              gap: spacing[1],
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: typography.size.xs, marginBottom: spacing[1] }}>
              {member.display_name}
            </Text>
            {!isSelf &&
              ROLE_ORDER.map((role) => (
                <Pressable
                  key={role}
                  accessibilityRole="button"
                  onPress={() => {
                    setMenu(false);
                    if (role !== member.role) onChangeRole?.(role);
                  }}
                  style={{ paddingVertical: spacing[3] }}
                >
                  <Text
                    style={{
                      color: role === member.role ? colors.accent : colors.text,
                      fontSize: typography.size.base,
                      fontWeight: role === member.role ? (typography.weight.semibold as '600') : (typography.weight.regular as '400'),
                    }}
                  >
                    {role === member.role ? '✓ ' : ''}Make {ROLE_LABELS[role]}
                  </Text>
                </Pressable>
              ))}
            {!isSelf ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMenu(false);
                  onKick?.();
                }}
                style={{ paddingVertical: spacing[3] }}
              >
                <Text style={{ color: colors.danger, fontSize: typography.size.base }}>Remove from space</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={() => setMenu(false)} style={{ paddingVertical: spacing[3] }}>
              <Text style={{ color: colors.textMuted, fontSize: typography.size.base }}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function RoleBadge({ role }: { role: SpaceRole }) {
  const { colors, spacing, radius, typography } = useTheme();
  if (role === 'member' || role === 'viewer') return null;
  const isAdmin = role === 'admin';
  return (
    <View
      style={{
        borderRadius: radius.sm,
        paddingHorizontal: spacing[2],
        paddingVertical: 2,
        backgroundColor: isAdmin ? colors.accent : colors.bgSubtle,
        borderWidth: isAdmin ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          color: isAdmin ? colors.accentFg : colors.textMuted,
          fontSize: typography.size.xs,
          fontWeight: typography.weight.medium as '500',
        }}
      >
        {ROLE_LABELS[role]}
      </Text>
    </View>
  );
}
