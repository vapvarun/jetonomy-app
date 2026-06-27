// app/subscriptions.tsx — the member's space/post subscriptions with a `via`
// chip + unsubscribe (SubscribeToggle resolves the row id from cache, gotcha #3).

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText, Hash } from 'lucide-react-native';

import SubscribeToggle from '@/components/SubscribeToggle';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useIsAuthed } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import type { Subscription } from '@/types/subscription';

const VIA_LABELS: Record<string, string> = {
  web: 'In-app',
  email: 'Email',
  both: 'In-app + Email',
};

export default function SubscriptionsScreen() {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authed = useIsAuthed();

  const { subscriptions, isLoading, isError, error, refetch } = useSubscriptions();
  const isAuthErr = (error as { status?: number } | null)?.status === 401;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
        <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>Subscriptions</Text>
      </View>

      {!authed || isAuthErr ? (
        <Center title="Log in to view subscriptions" />
      ) : isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
          <Text style={{ color: colors.text }}>Could not load subscriptions.</Text>
          <Pressable accessibilityRole="button" onPress={() => refetch()}>
            <Text style={{ color: colors.accent }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={subscriptions}
          keyExtractor={(s) => String(s.id)}
          renderItem={({ item }) => <SubscriptionRow sub={item} />}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: insets.bottom + spacing[8] }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: spacing[12], gap: spacing[2] }}>
              <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>No subscriptions</Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.size.base, textAlign: 'center' }}>
                Subscribe to spaces or posts to get notified.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function SubscriptionRow({ sub }: { sub: Subscription }) {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const isSpace = sub.object_type === 'space';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${sub.object_type}`}
      onPress={() => router.push(isSpace ? `/space/${sub.object_id}` : `/post/${sub.object_id}`)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing[4],
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.md,
          backgroundColor: colors.bgSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isSpace ? <Hash color={colors.textMuted} size={20} /> : <FileText color={colors.textMuted} size={20} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.text, fontSize: typography.size.base, fontWeight: typography.weight.medium as '500' }}>
          {isSpace ? 'Space' : 'Post'} #{sub.object_id}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.bgSubtle, borderRadius: radius.sm, paddingHorizontal: spacing[2], paddingVertical: 2 }}>
            <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
              {VIA_LABELS[sub.via] ?? sub.via}
            </Text>
          </View>
        </View>
      </View>
      <SubscribeToggle objectType={sub.object_type} objectId={sub.object_id} />
    </Pressable>
  );
}

function Center({ title }: { title: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] }}>
      <Text style={{ color: colors.text, fontSize: typography.size.base, textAlign: 'center' }}>{title}</Text>
    </View>
  );
}
