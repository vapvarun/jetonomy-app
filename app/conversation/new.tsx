// app/conversation/new.tsx — compose a new conversation (Pro, gated). Multi-select
// RecipientPicker + optional group title + first-message composer → createConversation.
// On success, replace to the thread screen with the returned conversation id.

import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react-native';

import MessageComposer from '@/components/MessageComposer';
import RecipientPicker from '@/components/RecipientPicker';
import { createConversation } from '@/api/conversations';
import { toApiError } from '@/api/client';
import { useFeatures } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import type { Conversation, RecipientSuggestion } from '@/types/conversation';

export default function NewConversationScreen() {
  const { messaging } = useFeatures();
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [recipients, setRecipients] = useState<RecipientSuggestion[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!messaging) router.replace('/');
  }, [messaging, router]);

  const create = useMutation<Conversation, Error, void>({
    mutationFn: () =>
      createConversation({
        recipient_ids: recipients.map((r) => r.id),
        message: message.trim(),
        title: title.trim() || undefined,
      }),
    onSuccess: (convo) => {
      router.replace(`/conversation/${convo.id}`);
    },
    onError: (e) => setError(toApiError(e).message),
  });

  const isGroup = recipients.length > 1;
  const canSend = recipients.length > 0 && message.trim().length > 0 && !create.isPending;

  function handleCreate() {
    if (!canSend) return;
    setError(null);
    create.mutate();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      {/* Top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[3],
          paddingBottom: spacing[2],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={colors.text} size={24} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>
          New message
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: spacing[2] }}>
          <Text style={{ color: colors.textMuted, fontSize: typography.size.xs, fontWeight: typography.weight.medium as '500' }}>
            TO
          </Text>
          <RecipientPicker selected={recipients} onChange={setRecipients} />
        </View>

        {isGroup ? (
          <View style={{ gap: spacing[2] }}>
            <Text style={{ color: colors.textMuted, fontSize: typography.size.xs, fontWeight: typography.weight.medium as '500' }}>
              GROUP NAME (OPTIONAL)
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Name this group…"
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.bgSubtle,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[3],
                color: colors.text,
                fontSize: typography.size.base,
              }}
            />
          </View>
        ) : null}

        {error ? (
          <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>{error}</Text>
        ) : null}
      </ScrollView>

      {/* First message composer */}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: insets.bottom }}>
        {recipients.length === 0 ? (
          <View style={{ padding: spacing[4], alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
              Add at least one recipient to start.
            </Text>
          </View>
        ) : (
          <MessageComposer
            value={message}
            onChangeText={setMessage}
            onSend={handleCreate}
            sending={create.isPending}
            placeholder="Write your message…"
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
