// components/manage/ManageStates.tsx — shared screen states for app/manage/*.
//
// Every admin screen renders one of these for forbidden / empty / error / load.
// 403 is the authoritative gate (06 spec) → ForbiddenState, NOT a crash.

import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ShieldAlert, Inbox, AlertCircle } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeContext';

/** Sticky screen header with a back chevron + title (+ optional right slot). */
export function ManageHeader({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        hitSlop={8}
      >
        <ArrowLeft color={colors.text} size={24} />
      </Pressable>
      <Text
        style={{
          flex: 1,
          color: colors.text,
          fontSize: typography.size.lg,
          fontWeight: typography.weight.semibold as '600',
        }}
      >
        {title}
      </Text>
      {right ?? null}
    </View>
  );
}

function Centered({ children }: { children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[6],
        gap: spacing[3],
      }}
    >
      {children}
    </View>
  );
}

export function LoadingState() {
  const { colors } = useTheme();
  return (
    <Centered>
      <ActivityIndicator size="large" color={colors.accent} />
    </Centered>
  );
}

export function ForbiddenState({
  message,
}: {
  message?: string;
}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Centered>
      <ShieldAlert color={colors.textMuted} size={40} />
      <Text
        style={{
          color: colors.text,
          fontSize: typography.size.lg,
          fontWeight: typography.weight.semibold as '600',
          textAlign: 'center',
        }}
      >
        Not allowed
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: typography.size.base,
          textAlign: 'center',
          marginTop: -spacing[1],
        }}
      >
        {message ?? "You don't have permission to view this."}
      </Text>
    </Centered>
  );
}

export function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { colors, typography } = useTheme();
  return (
    <Centered>
      <Inbox color={colors.textMuted} size={40} />
      <Text
        style={{
          color: colors.text,
          fontSize: typography.size.lg,
          fontWeight: typography.weight.semibold as '600',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.size.base,
            textAlign: 'center',
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </Centered>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <Centered>
      <AlertCircle color={colors.danger} size={40} />
      <Text
        style={{
          color: colors.text,
          fontSize: typography.size.base,
          textAlign: 'center',
        }}
      >
        {message ?? 'Something went wrong.'}
      </Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={onRetry}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[2],
          }}
        >
          <Text style={{ color: colors.accent, fontWeight: typography.weight.semibold as '600' }}>
            Retry
          </Text>
        </Pressable>
      ) : null}
    </Centered>
  );
}

/** Decide which state to show from a React Query result + a 403 check. */
export function isForbidden(err: unknown): boolean {
  return (err as { status?: number } | null)?.status === 403;
}
