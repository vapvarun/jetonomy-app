// components/ReplyItem.tsx — threaded reply row. Mounts the ReactionBar seam
// (renders null until Pro lights it up). Indents by parent depth (cap ~3).

import { Image, Pressable, Text, View } from 'react-native';
import { Check, CheckCircle2, Pencil, Quote, Trash2 } from 'lucide-react-native';

import ContentBody from '@/components/ContentBody';
import VoteButton from '@/components/VoteButton';
import ReactionBar from '@/components/ReactionBar';
import FlagButton from '@/components/FlagButton';
import { useTheme } from '@/theme/ThemeContext';
import type { Reply } from '@/types/reply';

const MAX_DEPTH = 3;

export interface ReplyItemProps {
  reply: Reply;
  depth?: number;
  /** Space is Q&A — enables accept controls. */
  isQa?: boolean;
  /** Viewer may accept/un-accept (post author or moderator). */
  canAccept?: boolean;
  /** Viewer may edit/delete (author or moderator). */
  canManage?: boolean;
  onQuote?: (reply: Reply) => void;
  onAccept?: (id: number) => void;
  onUnaccept?: (id: number) => void;
  onEdit?: (reply: Reply) => void;
  onDelete?: (id: number) => void;
}

export default function ReplyItem({
  reply,
  depth = 0,
  isQa = false,
  canAccept = false,
  canManage = false,
  onQuote,
  onAccept,
  onUnaccept,
  onEdit,
  onDelete,
}: ReplyItemProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const indent = Math.min(depth, MAX_DEPTH) * spacing[4];
  const isOptimistic = reply.id < 0;

  return (
    <View
      style={{
        marginLeft: indent,
        paddingVertical: spacing[3],
        borderTopWidth: 1,
        borderTopColor: colors.border,
        opacity: isOptimistic ? 0.6 : 1,
        gap: spacing[2],
        backgroundColor: reply.is_accepted ? colors.bgSubtle : 'transparent',
        borderRadius: reply.is_accepted ? radius.md : 0,
        paddingHorizontal: reply.is_accepted ? spacing[3] : 0,
      }}
    >
      {reply.is_accepted ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
          <CheckCircle2 color={colors.success} size={16} />
          <Text style={{ color: colors.success, fontSize: typography.size.xs, fontWeight: typography.weight.semibold as '600' }}>
            Accepted answer
          </Text>
        </View>
      ) : null}

      {/* Author row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        {reply.author_avatar ? (
          <Image source={{ uri: reply.author_avatar }} style={{ width: 22, height: 22, borderRadius: radius.full }} />
        ) : (
          <View style={{ width: 22, height: 22, borderRadius: radius.full, backgroundColor: colors.bgSubtle }} />
        )}
        <Text style={{ color: colors.text, fontSize: typography.size.sm, fontWeight: typography.weight.medium as '500' }} numberOfLines={1}>
          {reply.author_name}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>· {reply.time_ago}</Text>
        {reply.edited_at ? (
          <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>(edited)</Text>
        ) : null}
      </View>

      <ContentBody html={reply.content} />

      {/* Reaction seam (null until Pro) */}
      <ReactionBar target={{ kind: 'reply', id: reply.id }} seed={reply.reactions as never} />

      {/* Actions */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
        {!isOptimistic ? (
          <VoteButton kind="reply" id={reply.id} score={reply.vote_score} userValue={reply.viewer_vote ?? 0} horizontal />
        ) : null}

        {onQuote ? (
          <Action label="Quote" icon={<Quote color={colors.textMuted} size={16} />} onPress={() => onQuote(reply)} color={colors.textMuted} />
        ) : null}

        {isQa && canAccept && !isOptimistic ? (
          reply.is_accepted ? (
            <Action
              label="Unaccept"
              icon={<Check color={colors.success} size={16} />}
              onPress={() => onUnaccept?.(reply.id)}
              color={colors.success}
            />
          ) : (
            <Action
              label="Accept"
              icon={<Check color={colors.textMuted} size={16} />}
              onPress={() => onAccept?.(reply.id)}
              color={colors.textMuted}
            />
          )
        ) : null}

        {canManage && !isOptimistic ? (
          <>
            <Action label="Edit" icon={<Pencil color={colors.textMuted} size={16} />} onPress={() => onEdit?.(reply)} color={colors.textMuted} />
            <Action label="Delete" icon={<Trash2 color={colors.danger} size={16} />} onPress={() => onDelete?.(reply.id)} color={colors.danger} />
          </>
        ) : null}

        {/* Member report action (server-gated: 403 hides it). */}
        {!isOptimistic ? <FlagButton target={{ kind: 'reply', id: reply.id }} compact /> : null}
      </View>
    </View>
  );
}

function Action({
  label,
  icon,
  onPress,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
    >
      {icon}
      <Text style={{ color, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}
