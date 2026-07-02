// components/NotificationItem.tsx — one notification row.
//
// Tap → deep-link (resolved from object_type + object_id; the WEB object_url is
// NEVER navigated to). Unread rows show a dot + brighter text; read rows dim.
// Long-press toggles multi-select; a trailing dismiss button removes the row
// (swipe libs aren't in the dependency set, so dismiss is an explicit a11y button).

import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Href } from 'expo-router';
import {
  AtSign,
  Award,
  Bell,
  Check,
  CheckCircle2,
  ChevronUp,
  FileText,
  MessageSquare,
  X,
} from 'lucide-react-native';

import Avatar from '@/components/Avatar';
import { useTheme } from '@/theme/ThemeContext';
import type { NotificationItem as Notification } from '@/types/notification';

/**
 * Map a notification's object_type + object_id to a NATIVE route. The server
 * `object_url` is a web url (kept only for share/fallback) and must not be
 * opened in a WebView.
 *
 * Reply note: the payload exposes only the reply id (object_id) — the parent
 * post id is not in the notification JSON. Per the locked contract the reply id
 * is forwarded to the post screen (Content 02) as `reply`, which resolves the
 * parent thread and scrolls to the reply.
 */
export function notificationHref(n: Notification): Href | null {
  switch (n.object_type) {
    case 'post':
      return n.object_id != null ? (`/post/${n.object_id}` as Href) : null;
    case 'reply':
      return n.object_id != null
        ? ({ pathname: '/post/[id]', params: { id: String(n.object_id), reply: String(n.object_id) } } as Href)
        : null;
    case 'badge':
      return '/(tabs)/profile' as Href;
    case 'user':
      if (n.object_id != null) return `/user/${n.object_id}` as Href;
      return n.actor_id != null ? (`/user/${n.actor_id}` as Href) : null;
    default:
      return n.actor_id != null ? (`/user/${n.actor_id}` as Href) : null;
  }
}

function iconFor(type: string, color: string, size = 16) {
  if (type.includes('mention')) return <AtSign color={color} size={size} />;
  if (type.includes('accepted')) return <CheckCircle2 color={color} size={size} />;
  if (type.includes('vote')) return <ChevronUp color={color} size={size} />;
  if (type.includes('badge')) return <Award color={color} size={size} />;
  if (type.includes('reply')) return <MessageSquare color={color} size={size} />;
  if (type.includes('post')) return <FileText color={color} size={size} />;
  return <Bell color={color} size={size} />;
}

export interface NotificationItemProps {
  item: Notification;
  selectionMode?: boolean;
  selected?: boolean;
  onPress: (item: Notification) => void;
  onToggleSelect: (id: number) => void;
  onDismiss: (id: number) => void;
}

function NotificationRow({
  item,
  selectionMode,
  selected,
  onPress,
  onToggleSelect,
  onDismiss,
}: NotificationItemProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const unread = !item.is_read;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.message}
      accessibilityState={{ selected: !!selected }}
      onPress={() => (selectionMode ? onToggleSelect(item.id) : onPress(item))}
      onLongPress={() => onToggleSelect(item.id)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        backgroundColor: selected ? colors.bgSubtle : unread ? colors.surface : colors.bg,
        borderColor: selected ? colors.accent : colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing[3],
        opacity: unread ? 1 : 0.7,
      }}
    >
      {selectionMode ? (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: selected ? colors.accent : colors.border,
            backgroundColor: selected ? colors.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected ? <Check color={colors.accentFg} size={14} /> : null}
        </View>
      ) : null}

      <View style={{ position: 'relative' }}>
        <Avatar uri={item.actor_avatar} name={item.actor_name} size={40} />
        <View
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            backgroundColor: colors.surface,
            borderRadius: radius.full,
            padding: 2,
          }}
        >
          {iconFor(item.type, colors.textMuted)}
        </View>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.size.sm,
            fontWeight: (unread ? typography.weight.semibold : typography.weight.regular) as '600' | '400',
          }}
          numberOfLines={3}
        >
          {item.message}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
          {item.time_ago}
        </Text>
      </View>

      {unread && !selectionMode ? (
        <View style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.accent }} />
      ) : null}

      {!selectionMode ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          onPress={() => onDismiss(item.id)}
          hitSlop={10}
          style={{ padding: 2 }}
        >
          <X color={colors.textMuted} size={16} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export default memo(NotificationRow);
