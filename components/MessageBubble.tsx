// components/MessageBubble.tsx — one message. Mine vs theirs alignment; sender
// avatar + name shown on group threads for incoming messages. System notices
// (join/leave) render centered with no bubble. Optimistic sends show a pending /
// failed affordance (failed → tap to retry).

import { Image, Pressable, Text, View } from 'react-native';
import { Clock, AlertCircle } from 'lucide-react-native';

import ContentBody from '@/components/ContentBody';
import { useTheme } from '@/theme/ThemeContext';
import type { ThreadMessage } from '@/types/message';

export interface MessageBubbleProps {
  message: ThreadMessage;
  /** true when the message was sent by the current user. */
  mine: boolean;
  /** group thread → show sender identity on incoming bubbles. */
  isGroup?: boolean;
  /** retry handler for a failed optimistic send. */
  onRetry?: (message: ThreadMessage) => void;
}

export default function MessageBubble({ message, mine, isGroup = false, onRetry }: MessageBubbleProps) {
  const { colors, spacing, radius, typography } = useTheme();

  // System notice — centered, no bubble.
  if (message.is_system) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: spacing[2] }}>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.xs, textAlign: 'center' }}>
          {message.content_plain || message.content}
        </Text>
      </View>
    );
  }

  const pending = message._delivery === 'pending';
  const failed = message._delivery === 'failed';
  const bubbleBg = mine ? colors.accent : colors.bgSubtle;
  const bubbleFg = mine ? colors.accentFg : colors.text;

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: mine ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: spacing[2],
        paddingVertical: spacing[1],
      }}
    >
      {!mine && isGroup ? (
        message.sender_avatar ? (
          <Image source={{ uri: message.sender_avatar }} style={{ width: 28, height: 28, borderRadius: radius.full }} />
        ) : (
          <View style={{ width: 28, height: 28, borderRadius: radius.full, backgroundColor: colors.bgSubtle }} />
        )
      ) : null}

      <View style={{ maxWidth: '78%', gap: 2 }}>
        {!mine && isGroup ? (
          <Text style={{ color: colors.textMuted, fontSize: typography.size.xs, marginLeft: spacing[2] }}>
            {message.sender_name}
          </Text>
        ) : null}

        <View
          style={{
            backgroundColor: bubbleBg,
            borderRadius: radius.lg,
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[2],
            opacity: pending ? 0.6 : 1,
            borderBottomRightRadius: mine ? radius.sm : radius.lg,
            borderBottomLeftRadius: mine ? radius.lg : radius.sm,
          }}
        >
          {/* mine bubbles use accentFg; ContentBody themes to text, so plain Text for mine. */}
          {mine ? (
            <Text style={{ color: bubbleFg, fontSize: typography.size.base, lineHeight: typography.lineHeight.base }}>
              {message.content_plain || stripBasic(message.content)}
            </Text>
          ) : (
            <ContentBody html={message.content} />
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            alignSelf: mine ? 'flex-end' : 'flex-start',
          }}
        >
          {failed ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry sending"
              onPress={() => onRetry?.(message)}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <AlertCircle color={colors.danger} size={12} />
              <Text style={{ color: colors.danger, fontSize: typography.size.xs }}>Failed - tap to retry</Text>
            </Pressable>
          ) : pending ? (
            <Clock color={colors.textMuted} size={12} />
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
              {message.created_at_human}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

/** Minimal tag-strip fallback for the mine-bubble plain render path. */
function stripBasic(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}
