// components/ConversationItem.tsx — one conversation list row: avatar(s) of the
// other participant(s), title, last-message preview, relative time, unread dot,
// muted/archived glyphs. Pure presentation; the screen owns navigation + data.

import { Image, Pressable, Text, View } from 'react-native';
import { BellOff, Archive } from 'lucide-react-native';

import { useCurrentUser } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import { relativeTime } from '@/utils/date';
import type { Conversation, Participant } from '@/types/conversation';

export interface ConversationItemProps {
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
}

/** Participants other than me (for avatars + direct-title fallback). */
function others(conversation: Conversation, myId: number | undefined): Participant[] {
  const list = conversation.participants.filter((p) => p.user_id !== myId);
  return list.length > 0 ? list : conversation.participants;
}

export default function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const me = useCurrentUser();
  const { colors, spacing, radius, typography } = useTheme();
  const peers = others(conversation, me?.user_id);
  const lead = peers[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Conversation: ${conversation.title}`}
      onPress={() => onPress(conversation)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[1],
      }}
    >
      {/* Avatar (lead peer) */}
      {lead?.avatar ? (
        <Image source={{ uri: lead.avatar }} style={{ width: 44, height: 44, borderRadius: radius.full }} />
      ) : (
        <View style={{ width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.bgSubtle }} />
      )}

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: colors.text,
              fontSize: typography.size.base,
              fontWeight: (conversation.unread
                ? typography.weight.bold
                : typography.weight.medium) as '700' | '500',
            }}
          >
            {conversation.title}
          </Text>
          {conversation.is_muted ? <BellOff color={colors.textMuted} size={14} /> : null}
          {conversation.is_archived ? <Archive color={colors.textMuted} size={14} /> : null}
          <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
            {relativeTime(conversation.last_message_at)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: conversation.unread ? colors.text : colors.textMuted,
              fontSize: typography.size.sm,
            }}
          >
            {conversation.last_message_preview ?? 'No messages yet'}
          </Text>
          {conversation.unread ? (
            <View
              style={{ width: 9, height: 9, borderRadius: radius.full, backgroundColor: colors.accent }}
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Skeleton row for the list loading state. */
export function ConversationItemSkeleton() {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3] }}>
      <View style={{ width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.bgSubtle }} />
      <View style={{ flex: 1, gap: spacing[2] }}>
        <View style={{ height: 12, width: '50%', borderRadius: radius.sm, backgroundColor: colors.bgSubtle }} />
        <View style={{ height: 10, width: '80%', borderRadius: radius.sm, backgroundColor: colors.bgSubtle }} />
      </View>
    </View>
  );
}
