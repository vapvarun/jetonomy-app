// components/SubscribeToggle.tsx — bell toggle with optimistic subscribe state.

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Bell, BellOff } from 'lucide-react-native';

import { useIsSubscribed, useToggleSubscription } from '@/hooks/useSubscriptions';
import { useTheme } from '@/theme/ThemeContext';
import type { SubscriptionObjectType, SubscriptionVia } from '@/types/subscription';

export interface SubscribeToggleProps {
  objectType: SubscriptionObjectType;
  objectId: number;
  /** default delivery channel when subscribing. */
  via?: SubscriptionVia;
  /** show "Subscribe"/"Subscribed" text next to the bell. */
  withLabel?: boolean;
}

export default function SubscribeToggle({
  objectType,
  objectId,
  via = 'both',
  withLabel = false,
}: SubscribeToggleProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const { subscribed } = useIsSubscribed(objectType, objectId);
  const toggle = useToggleSubscription(objectType, objectId);

  function handlePress() {
    toggle.mutate({ subscribe: !subscribed, via });
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subscribed ? 'Unsubscribe' : 'Subscribe'}
      accessibilityState={{ selected: subscribed, busy: toggle.isPending }}
      onPress={handlePress}
      disabled={toggle.isPending}
      style={{
        minHeight: 40,
        minWidth: 40,
        paddingHorizontal: withLabel ? spacing[3] : spacing[2],
        borderRadius: radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[2],
        backgroundColor: subscribed ? colors.bgSubtle : 'transparent',
        borderWidth: 1,
        borderColor: subscribed ? colors.accent : colors.border,
        opacity: toggle.isPending ? 0.6 : 1,
      }}
    >
      {toggle.isPending ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <View>
          {subscribed ? (
            <Bell color={colors.accent} size={18} />
          ) : (
            <BellOff color={colors.textMuted} size={18} />
          )}
        </View>
      )}
      {withLabel ? (
        <Text
          style={{
            color: subscribed ? colors.accent : colors.textMuted,
            fontSize: typography.size.sm,
            fontWeight: typography.weight.medium as '500',
          }}
        >
          {subscribed ? 'Subscribed' : 'Subscribe'}
        </Text>
      ) : null}
    </Pressable>
  );
}
