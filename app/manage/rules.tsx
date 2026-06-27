// app/manage/rules.tsx — advanced auto-moderation rules CRUD (Pro; jetonomy_moderate).

import { useState, type ReactNode } from 'react';
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
import { Plus, Trash2, X } from 'lucide-react-native';

import {
  listRules,
  createRule,
  updateRule,
  deleteRule,
} from '@/api/modRules';
import type { ApiError } from '@/api/client';
import type {
  CreateModRuleBody,
  ModRule,
  ModRuleAction,
  ModRuleType,
} from '@/types/modRules';
import { useTheme } from '@/theme/ThemeContext';
import {
  ManageHeader,
  LoadingState,
  ForbiddenState,
  EmptyState,
  ErrorState,
  isForbidden,
} from '@/components/manage/ManageStates';

const TYPES: ModRuleType[] = ['pattern', 'keyword', 'link_count'];
const ACTIONS: ModRuleAction[] = ['flag', 'spam', 'trash', 'hold'];

export default function RulesScreen() {
  const { colors, spacing } = useTheme();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery<ModRule[], ApiError>({ queryKey: ['mod-rules'], queryFn: listRules });

  const create = useMutation<ModRule, ApiError, CreateModRuleBody>({
    mutationFn: createRule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mod-rules'] });
      setOpen(false);
    },
  });

  const toggle = useMutation<ModRule, ApiError, { id: number; enabled: boolean }>({
    mutationFn: ({ id, enabled }) => updateRule(id, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mod-rules'] }),
  });

  const remove = useMutation<{ deleted: true }, ApiError, number>({
    mutationFn: deleteRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mod-rules'] }),
  });

  if (q.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="Auto-moderation" />
        <LoadingState />
      </View>
    );
  }
  if (q.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="Auto-moderation" />
        {isForbidden(q.error) ? (
          <ForbiddenState message="Moderator access required." />
        ) : (
          <ErrorState message={q.error?.message} onRetry={() => q.refetch()} />
        )}
      </View>
    );
  }

  const rules: ModRule[] = q.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ManageHeader
        title="Auto-moderation"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New rule"
            onPress={() => setOpen(true)}
            hitSlop={8}
          >
            <Plus color={colors.accent} size={24} />
          </Pressable>
        }
      />
      {rules.length === 0 ? (
        <EmptyState title="No rules" subtitle="Add a rule to auto-moderate content." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: spacing[12] }}>
          {rules.map((r) => (
            <RuleRow
              key={r.id}
              rule={r}
              onToggle={(enabled) => toggle.mutate({ id: r.id, enabled })}
              onDelete={() => remove.mutate(r.id)}
            />
          ))}
        </ScrollView>
      )}

      <CreateRuleSheet
        visible={open}
        pending={create.isPending}
        error={create.error?.message ?? null}
        onClose={() => setOpen(false)}
        onSubmit={(body) => create.mutate(body)}
      />
    </View>
  );
}

function RuleRow({
  rule,
  onToggle,
  onDelete,
}: {
  rule: ModRule;
  onToggle: (enabled: boolean) => void;
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
        gap: spacing[1],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <Text
          style={{
            flex: 1,
            color: colors.text,
            fontSize: typography.size.base,
            fontWeight: typography.weight.semibold as '600',
          }}
        >
          {rule.name}
        </Text>
        <Switch value={rule.enabled} onValueChange={onToggle} />
        <Pressable accessibilityRole="button" accessibilityLabel="Delete rule" onPress={onDelete} hitSlop={8}>
          <Trash2 color={colors.danger} size={18} />
        </Pressable>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
        {rule.type} → {rule.action}
      </Text>
      <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
        {rule.pattern}
      </Text>
    </View>
  );
}

function CreateRuleSheet({
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
  onSubmit: (body: CreateModRuleBody) => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState<ModRuleType>('keyword');
  const [pattern, setPattern] = useState('');
  const [action, setAction] = useState<ModRuleAction>('flag');

  const submit = () => {
    if (!name.trim() || !pattern.trim()) return;
    onSubmit({ name: name.trim(), type, pattern: pattern.trim(), action, enabled: true });
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
              New rule
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}>
              <X color={colors.textMuted} size={22} />
            </Pressable>
          </View>

          <Field label="Name">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Block crypto spam"
              placeholderTextColor={colors.textMuted}
              style={inputStyle(colors, spacing, radius)}
            />
          </Field>

          <Field label="Type">
            <Chips options={TYPES} value={type} onChange={setType} />
          </Field>

          <Field label="Pattern">
            <TextInput
              value={pattern}
              onChangeText={setPattern}
              placeholder="keyword / regex / number"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              style={inputStyle(colors, spacing, radius)}
            />
          </Field>

          <Field label="Action">
            <Chips options={ACTIONS} value={action} onChange={setAction} />
          </Field>

          {error ? (
            <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>{error}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create rule"
            disabled={pending || !name.trim() || !pattern.trim()}
            onPress={submit}
            style={{
              alignItems: 'center',
              backgroundColor: pending || !name.trim() || !pattern.trim() ? colors.border : colors.accent,
              borderRadius: radius.md,
              paddingVertical: spacing[3],
            }}
          >
            <Text style={{ color: colors.accentFg, fontWeight: typography.weight.semibold as '600' }}>
              {pending ? 'Creating…' : 'Create rule'}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ gap: spacing[1] }}>
      <Text style={{ color: colors.textMuted, fontSize: typography.size.xs, textTransform: 'uppercase' }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable
            key={o}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o)}
            style={{
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[1],
              borderRadius: radius.full,
              backgroundColor: active ? colors.accent : colors.bgSubtle,
              borderWidth: 1,
              borderColor: active ? colors.accent : colors.border,
            }}
          >
            <Text style={{ color: active ? colors.accentFg : colors.text, fontSize: typography.size.sm }}>
              {o}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function inputStyle(
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
