// components/MessageComposer.tsx — sticky bottom input for a thread. Multiline,
// grows to a cap, send button disabled while empty / sending / when the thread is
// read-only (left) or blocked. The screen owns the actual send (optimistic).

import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View, Text } from 'react-native';
import { Send } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeContext';

export interface MessageComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending?: boolean;
  /** read-only: viewer left the conversation. */
  left?: boolean;
  /** composer disabled: direct conversation is blocked. */
  blocked?: boolean;
  placeholder?: string;
}

export default function MessageComposer({
  value,
  onChangeText,
  onSend,
  sending = false,
  left = false,
  blocked = false,
  placeholder = 'Message…',
}: MessageComposerProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const [height, setHeight] = useState(40);

  if (left || blocked) {
    return (
      <View style={{ padding: spacing[4], alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.sm, textAlign: 'center' }}>
          {left ? 'You left this conversation.' : 'You blocked this conversation.'}
        </Text>
      </View>
    );
  }

  const canSend = value.trim().length > 0 && !sending;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing[2],
        padding: spacing[3],
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        onContentSizeChange={(e) =>
          setHeight(Math.min(120, Math.max(40, e.nativeEvent.contentSize.height)))
        }
        style={{
          flex: 1,
          minHeight: 40,
          height,
          backgroundColor: colors.bgSubtle,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing[3],
          paddingTop: spacing[2],
          paddingBottom: spacing[2],
          color: colors.text,
          fontSize: typography.size.base,
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: !canSend }}
        onPress={onSend}
        disabled={!canSend}
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.full,
          backgroundColor: canSend ? colors.accent : colors.bgSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {sending ? (
          <ActivityIndicator color={colors.accentFg} size="small" />
        ) : (
          <Send color={canSend ? colors.accentFg : colors.textMuted} size={20} />
        )}
      </Pressable>
    </View>
  );
}
