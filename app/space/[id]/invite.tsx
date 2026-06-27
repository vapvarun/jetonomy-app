// app/space/[id]/invite.tsx — two flows:
//   (a) admin generates an invite link (share sheet);
//   (b) accept-token flow from a deep link `/space/{id}/invite?token=...`.
//
// Deep link (gotcha #8): web `…/{base_slug}/invite/{token}/` maps here carrying
// `token`. 401 jetonomy_login_required → route to auth, retain the token.

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Copy, Link2 } from 'lucide-react-native';

import { useGenerateInvite, useMyMembership, useSpace, useUseInvite } from '@/hooks/useSpaces';
import { useIsAuthed } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';

export default function SpaceInviteScreen() {
  const { id, token } = useLocalSearchParams<{ id: string; token?: string }>();
  const spaceId = Number(id);
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authed = useIsAuthed();

  const spaceQ = useSpace(spaceId);
  const membership = useMyMembership(spaceId);

  // ----- Accept-token flow -----
  const accept = useUseInvite();
  const [acceptStarted, setAcceptStarted] = useState(false);

  useEffect(() => {
    if (token && authed && !acceptStarted) {
      setAcceptStarted(true);
      accept.mutate(token, {
        onSuccess: (res) => {
          router.replace(`/space/${res.space_id}`);
        },
      });
    }
  }, [token, authed, acceptStarted, accept, router]);

  // ----- Generate flow -----
  const generate = useGenerateInvite(spaceId);
  const [maxUses, setMaxUses] = useState('');

  function handleGenerate() {
    const n = parseInt(maxUses, 10);
    generate.mutate(Number.isFinite(n) && n > 0 ? { max_uses: n } : undefined);
  }

  async function handleShare(url: string) {
    try {
      await Share.share({ message: url, url });
    } catch {
      // user cancelled share — no-op.
    }
  }

  const acceptErr = accept.error as { code?: string; message?: string } | null;
  const isLoginRequired = acceptErr?.code === 'jetonomy_login_required' || (accept.error as { status?: number } | null)?.status === 401;

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
        <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>Invite</Text>
      </View>

      <View style={{ padding: spacing[5], gap: spacing[5] }}>
        {/* ----- Accept-token flow UI ----- */}
        {token ? (
          <View style={{ gap: spacing[3], alignItems: 'center', paddingVertical: spacing[6] }}>
            {accept.isPending ? (
              <>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={{ color: colors.textMuted }}>Accepting invite…</Text>
              </>
            ) : isLoginRequired || !authed ? (
              <>
                <Text style={{ color: colors.text, fontSize: typography.size.base, textAlign: 'center' }}>
                  Log in to accept this invite.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/login?next=${encodeURIComponent(`/space/${spaceId}/invite?token=${token}`)}`)}
                  style={{ minHeight: 44, paddingHorizontal: spacing[5], borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: colors.accentFg, fontWeight: typography.weight.semibold as '600' }}>Log in</Text>
                </Pressable>
              </>
            ) : accept.isError ? (
              <>
                <Text style={{ color: colors.danger, textAlign: 'center' }}>{acceptErr?.message ?? 'This invite is invalid or expired.'}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.replace(`/space/${spaceId}`)}
                  style={{ borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[5], paddingVertical: spacing[3] }}
                >
                  <Text style={{ color: colors.accent }}>Open space</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        ) : (
          /* ----- Generate flow UI (admin only) ----- */
          membership.isAdmin ? (
            <View style={{ gap: spacing[4] }}>
              <View style={{ gap: spacing[1] }}>
                <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>
                  Invite people to {spaceQ.data?.title ?? 'this space'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
                  Generate a link anyone can use to join.
                </Text>
              </View>

              <View style={{ gap: spacing[2] }}>
                <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>Max uses (optional)</Text>
                <TextInput
                  value={maxUses}
                  onChangeText={setMaxUses}
                  placeholder="Unlimited"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  accessibilityLabel="Maximum uses"
                  style={{
                    color: colors.text,
                    fontSize: typography.size.base,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingHorizontal: spacing[3],
                    minHeight: 44,
                  }}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={handleGenerate}
                disabled={generate.isPending}
                style={{
                  minHeight: 48,
                  borderRadius: radius.md,
                  backgroundColor: colors.accent,
                  flexDirection: 'row',
                  gap: spacing[2],
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: generate.isPending ? 0.6 : 1,
                }}
              >
                <Link2 color={colors.accentFg} size={18} />
                <Text style={{ color: colors.accentFg, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>
                  {generate.isPending ? 'Generating…' : 'Generate invite link'}
                </Text>
              </Pressable>

              {generate.isError ? (
                <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>
                  {(generate.error as { message?: string })?.message ?? 'Could not generate an invite.'}
                </Text>
              ) : null}

              {generate.data ? (
                <View style={{ gap: spacing[2], padding: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.bgSubtle }}>
                  <Text numberOfLines={2} style={{ color: colors.text, fontSize: typography.size.sm }}>
                    {generate.data.invite_url}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Share invite link"
                      onPress={() => handleShare(generate.data!.invite_url)}
                      style={{ flex: 1, minHeight: 40, flexDirection: 'row', gap: spacing[2], alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.accent }}
                    >
                      <Copy color={colors.accentFg} size={16} />
                      <Text style={{ color: colors.accentFg, fontSize: typography.size.sm, fontWeight: typography.weight.semibold as '600' }}>Share link</Text>
                    </Pressable>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
                    {generate.data.max_uses > 0 ? `Up to ${generate.data.max_uses} use(s)` : 'Unlimited uses'}
                    {generate.data.expires_at ? ` · expires ${generate.data.expires_at}` : ''}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing[10], gap: spacing[2] }}>
              <Text style={{ color: colors.text, fontWeight: typography.weight.semibold as '600' }}>Only space admins can create invites</Text>
              <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Ask a space admin to invite you.</Text>
            </View>
          )
        )}
      </View>
    </View>
  );
}
