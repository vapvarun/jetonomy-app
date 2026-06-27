// app/manage/announcements.tsx — admin pin/unpin site announcements (max 5).
// Gating: manage_options OR jetonomy_manage_spaces (server-authoritative 403).

import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pin, X } from 'lucide-react-native';

import { list, pin, unpin } from '@/api/announcements';
import type { ApiError } from '@/api/client';
import type { SiteAnnouncement } from '@/types/announcements';
import { useTheme } from '@/theme/ThemeContext';
import { relativeTime } from '@/utils/date';
import {
  ManageHeader,
  LoadingState,
  ForbiddenState,
  EmptyState,
  ErrorState,
  isForbidden,
} from '@/components/manage/ManageStates';

export default function AnnouncementsAdminScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const qc = useQueryClient();
  const [postId, setPostId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const q = useQuery<SiteAnnouncement[], ApiError>({
    queryKey: ['announcements', 'admin'],
    queryFn: list,
  });

  const pinM = useMutation<SiteAnnouncement, ApiError, number>({
    mutationFn: (id) => pin(id),
    onSuccess: () => {
      setPostId('');
      setFormError(null);
      void qc.invalidateQueries({ queryKey: ['announcements', 'admin'] });
      void qc.invalidateQueries({ queryKey: ['site-announcements', 'active'] });
    },
    onError: (err) => setFormError(err.message),
  });

  const unpinM = useMutation<{ deleted: true }, ApiError, number>({
    mutationFn: (id) => unpin(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['announcements', 'admin'] });
      void qc.invalidateQueries({ queryKey: ['site-announcements', 'active'] });
    },
  });

  if (q.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="Announcements" />
        <LoadingState />
      </View>
    );
  }
  if (q.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ManageHeader title="Announcements" />
        {isForbidden(q.error) ? (
          <ForbiddenState message="Admin or space-manager access required." />
        ) : (
          <ErrorState message={q.error?.message} onRetry={() => q.refetch()} />
        )}
      </View>
    );
  }

  const items: SiteAnnouncement[] = q.data ?? [];
  const atCap = items.length >= 5;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ManageHeader title="Announcements" />
      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: spacing[12] }}>
        {/* Pin a post */}
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
          <Text style={{ color: colors.text, fontWeight: typography.weight.semibold as '600' }}>
            Pin a post
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            <TextInput
              value={postId}
              onChangeText={setPostId}
              placeholder="Post id"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              editable={!atCap}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing[3],
                color: colors.text,
                opacity: atCap ? 0.5 : 1,
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pin post"
              disabled={atCap || !Number(postId) || pinM.isPending}
              onPress={() => Number(postId) && pinM.mutate(Number(postId))}
              style={{
                paddingHorizontal: spacing[4],
                justifyContent: 'center',
                backgroundColor: atCap || !Number(postId) ? colors.border : colors.accent,
                borderRadius: radius.md,
              }}
            >
              <Text style={{ color: colors.accentFg, fontWeight: typography.weight.semibold as '600' }}>
                {pinM.isPending ? '…' : 'Pin'}
              </Text>
            </Pressable>
          </View>
          {atCap ? (
            <Text style={{ color: colors.danger, fontSize: typography.size.xs }}>
              Max 5 announcements. Unpin one first.
            </Text>
          ) : null}
          {formError ? (
            <Text style={{ color: colors.danger, fontSize: typography.size.xs }}>{formError}</Text>
          ) : null}
        </View>

        {/* Current pins */}
        {items.length === 0 ? (
          <EmptyState title="No pins" subtitle="Pin a post to announce it site-wide." />
        ) : (
          items.map((a) => (
            <View
              key={a.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[2],
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing[4],
              }}
            >
              <Pin color={colors.accent} size={18} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontWeight: typography.weight.semibold as '600' }}>
                  {a.title || `Post #${a.id}`}
                </Text>
                {a.pinned_at ? (
                  <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
                    pinned {relativeTime(a.pinned_at)}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Unpin"
                onPress={() => unpinM.mutate(a.id)}
                hitSlop={8}
              >
                <X color={colors.danger} size={20} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
