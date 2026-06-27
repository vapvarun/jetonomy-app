// app/manage/index.tsx — Manage home. Grid of tiles filtered by coarse caps.
// Visibility is a convenience; each destination still treats its 403 as the gate.

import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ShieldCheck,
  Flag,
  Layers,
  BarChart3,
  Filter,
  Megaphone,
  Webhook,
  Sparkles,
  Palette,
  Search,
  RefreshCw,
  Mail,
  ChevronRight,
} from 'lucide-react-native';

import { useCurrentUser } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import { readCapabilities, type Capabilities, type ManageTile } from '@/types/admin';
import { ManageHeader, EmptyState } from '@/components/manage/ManageStates';

const ICONS: Record<string, typeof ShieldCheck> = {
  queue: ShieldCheck,
  flags: Flag,
  spaces: Layers,
  analytics: BarChart3,
  rules: Filter,
  announcements: Megaphone,
  webhooks: Webhook,
  ai: Sparkles,
  'white-label': Palette,
  seo: Search,
  recount: RefreshCw,
  digest: Mail,
};

const TILES: ManageTile[] = [
  {
    key: 'queue',
    label: 'Moderation queue',
    description: 'Approve, spam, or trash pending content.',
    route: '/manage/queue',
    requires: 'jetonomy_moderate',
  },
  {
    key: 'flags',
    label: 'Flags',
    description: 'Review and resolve reported content.',
    route: '/manage/flags',
    requires: 'jetonomy_moderate',
  },
  {
    key: 'rules',
    label: 'Auto-moderation rules',
    description: 'Pattern / keyword / link rules.',
    route: '/manage/rules',
    requires: 'jetonomy_moderate',
  },
  {
    key: 'spaces',
    label: 'Space moderation',
    description: 'Moderate a single space you manage.',
    route: '/manage/space/0',
    requires: 'jetonomy_manage_spaces',
  },
  {
    key: 'announcements',
    label: 'Announcements',
    description: 'Pin posts site-wide (max 5).',
    route: '/manage/announcements',
    requires: 'jetonomy_manage_spaces',
  },
  {
    key: 'seo',
    label: 'Space SEO',
    description: 'Per-space search metadata.',
    route: '/manage/seo',
    requires: 'jetonomy_manage_spaces',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    description: 'KPIs, engagement, top spaces.',
    route: '/manage/analytics',
    requires: 'manage_options',
  },
  {
    key: 'webhooks',
    label: 'Webhooks',
    description: 'Outgoing event deliveries.',
    route: '/manage/webhooks',
    requires: 'manage_options',
  },
  {
    key: 'ai',
    label: 'AI usage',
    description: 'Token and cost dashboard.',
    route: '/manage/ai',
    requires: 'manage_options',
  },
  {
    key: 'white-label',
    label: 'White-label',
    description: 'Brand name, logo, colors, CSS.',
    route: '/manage/white-label',
    requires: 'manage_options',
  },
  {
    key: 'recount',
    label: 'Maintenance',
    description: 'Rebuild counts, set trust levels.',
    route: '/manage/recount',
    requires: 'manage_options',
  },
];

export default function ManageHome() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useCurrentUser();
  const caps: Capabilities = readCapabilities(me);

  const visible = TILES.filter((t) => Boolean(caps[t.requires]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ManageHeader title="Manage" />
      {visible.length === 0 ? (
        <EmptyState
          title="No management tools"
          subtitle="Your account doesn't have moderation or admin access on this site."
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: spacing[4],
            gap: spacing[3],
            paddingBottom: insets.bottom + spacing[8],
          }}
        >
          {visible.map((t) => {
            const Icon = ICONS[t.key] ?? ShieldCheck;
            return (
              <Pressable
                key={t.key}
                accessibilityRole="button"
                accessibilityLabel={t.label}
                onPress={() => router.push(t.route)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[3],
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing[4],
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.bgSubtle,
                  }}
                >
                  <Icon color={colors.accent} size={20} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: typography.size.base,
                      fontWeight: typography.weight.semibold as '600',
                    }}
                  >
                    {t.label}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
                    {t.description}
                  </Text>
                </View>
                <ChevronRight color={colors.textMuted} size={20} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
