// app/manage/webhooks.tsx — outgoing webhooks CRUD + test (Pro; manage_options).

import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Send, X } from 'lucide-react-native';

import { list, create, remove, test, update } from '@/api/webhooks';
import type { ApiError } from '@/api/client';
import type { CreateWebhookBody, Webhook, WebhookTestResult } from '@/types/webhooks';
import { useTheme } from '@/theme/ThemeContext';
import {
  ManageHeader,
  LoadingState,
  ForbiddenState,
  EmptyState,
  ErrorState,
  isForbidden,
} from '@/components/manage/ManageStates';

export default function WebhooksScreen() {
  const { colors, spacing } = useTheme();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [testResult, setTestResult] = useState<Record<number, WebhookTestResult>>({});

  const q = useQuery<Webhook[], ApiError>({ queryKey: ['webhooks'], queryFn: list });

  const createM = useMutation<Webhook, ApiError, CreateWebhookBody>({
    mutationFn: create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['webhooks'] });
      setOpen(false);
    },
  });

  const toggle = useMutation<Webhook, ApiError, { id: number; active: boolean }>({
    mutationFn: ({ id, active }) => update(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const removeM = useMutation<{ deleted: true }, ApiError, number>({
    mutationFn: remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const testM = useMutation<WebhookTestResult, ApiError, number>({
    mutationFn: test,
    onSuccess: (res, id) => setTestResult((p) => ({ ...p, [id]: res })),
  });

  if (q.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="Webhooks" />
        <LoadingState />
      </View>
    );
  }
  if (q.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="Webhooks" />
        {isForbidden(q.error) ? (
          <ForbiddenState message="Admin access required." />
        ) : (
          <ErrorState message={q.error?.message} onRetry={() => q.refetch()} />
        )}
      </View>
    );
  }

  const hooks: Webhook[] = q.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ManageHeader
        title="Webhooks"
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="New webhook" onPress={() => setOpen(true)} hitSlop={8}>
            <Plus color={colors.accent} size={24} />
          </Pressable>
        }
      />
      {hooks.length === 0 ? (
        <EmptyState title="No webhooks" subtitle="Add an endpoint to receive events." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: spacing[12] }}>
          {hooks.map((h) => (
            <WebhookRow
              key={h.id}
              hook={h}
              result={testResult[h.id]}
              testing={testM.isPending && testM.variables === h.id}
              onToggle={(active) => toggle.mutate({ id: h.id, active })}
              onTest={() => testM.mutate(h.id)}
              onDelete={() => removeM.mutate(h.id)}
            />
          ))}
        </ScrollView>
      )}

      <CreateWebhookSheet
        visible={open}
        pending={createM.isPending}
        error={createM.error?.message ?? null}
        onClose={() => setOpen(false)}
        onSubmit={(body) => createM.mutate(body)}
      />
    </View>
  );
}

function WebhookRow({
  hook,
  result,
  testing,
  onToggle,
  onTest,
  onDelete,
}: {
  hook: Webhook;
  result?: WebhookTestResult;
  testing: boolean;
  onToggle: (active: boolean) => void;
  onTest: () => void;
  onDelete: () => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing[4],
        gap: spacing[2],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: typography.size.sm }}>
          {hook.url}
        </Text>
        <Switch value={hook.active} onValueChange={onToggle} />
      </View>
      <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
        {hook.events.join(', ') || 'all events'}
        {hook.last_status != null ? ` · last ${hook.last_status}` : ''}
      </Text>
      {result ? (
        <Text style={{ color: result.delivered ? colors.success : colors.danger, fontSize: typography.size.xs }}>
          Test: {result.delivered ? 'delivered' : 'failed'}
          {result.status != null ? ` (${result.status})` : ''}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[1] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send test"
          onPress={onTest}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[1],
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Send color={colors.accent} size={15} />
          <Text style={{ color: colors.accent, fontSize: typography.size.sm }}>
            {testing ? 'Testing…' : 'Test'}
          </Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Delete webhook" onPress={onDelete} hitSlop={8}>
          <Trash2 color={colors.danger} size={18} />
        </Pressable>
      </View>
    </View>
  );
}

function CreateWebhookSheet({
  visible,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (body: CreateWebhookBody) => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState('');
  const [secret, setSecret] = useState('');
  const [active, setActive] = useState(true);

  const submit = () => {
    if (!url.trim()) return;
    onSubmit({
      url: url.trim(),
      events: events
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean),
      secret: secret.trim() || undefined,
      active,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: spacing[4],
            gap: spacing[3],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>
              New webhook
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}>
              <X color={colors.textMuted} size={22} />
            </Pressable>
          </View>

          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://example.com/hook"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="url"
            style={sheetInput(colors, spacing, radius)}
          />
          <TextInput
            value={events}
            onChangeText={setEvents}
            placeholder="events, comma-separated (blank = all)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={sheetInput(colors, spacing, radius)}
          />
          <TextInput
            value={secret}
            onChangeText={setSecret}
            placeholder="signing secret (optional)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={sheetInput(colors, spacing, radius)}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <Switch value={active} onValueChange={setActive} />
            <Text style={{ color: colors.text }}>Active</Text>
          </View>

          {error ? <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create webhook"
            disabled={pending || !url.trim()}
            onPress={submit}
            style={{
              alignItems: 'center',
              backgroundColor: pending || !url.trim() ? colors.border : colors.accent,
              borderRadius: radius.md,
              paddingVertical: spacing[3],
            }}
          >
            <Text style={{ color: colors.accentFg, fontWeight: typography.weight.semibold as '600' }}>
              {pending ? 'Creating…' : 'Create'}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function sheetInput(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  radius: ReturnType<typeof useTheme>['radius']
) {
  return {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[3],
    color: colors.text,
  } as const;
}
