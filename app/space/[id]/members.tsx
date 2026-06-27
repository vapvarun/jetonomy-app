// app/space/[id]/members.tsx — full member list + "Managed by" privileged
// strip + (privileged) join-requests queue with approve/deny. Space-admins get
// inline role edit + kick via MemberRow's action menu.

import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Lock } from 'lucide-react-native';

import MemberRow from '@/components/MemberRow';
import {
  useApproveJoinRequest,
  useDenyJoinRequest,
  useJoinRequests,
  useLeaveSpace,
  useMyMembership,
  useSpaceMembers,
  useSpacePrivilegedMembers,
  useUpdateMemberRole,
} from '@/hooks/useSpaces';
import { useCurrentUser } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import type { JoinRequest, SpaceRole } from '@/types/space';

export default function SpaceMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const spaceId = Number(id);
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useCurrentUser();

  const membership = useMyMembership(spaceId);
  const membersQ = useSpaceMembers(spaceId);
  const privilegedQ = useSpacePrivilegedMembers(spaceId);
  const requestsQ = useJoinRequests(spaceId, membership.isPrivileged);

  const updateRole = useUpdateMemberRole(spaceId);
  const leave = useLeaveSpace(spaceId);
  const approve = useApproveJoinRequest(spaceId);
  const deny = useDenyJoinRequest(spaceId);

  const gateError = (membersQ.error as { status?: number } | null)?.status === 403;
  const requests = requestsQ.data?.data ?? [];

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
        <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>Members</Text>
      </View>

      {membersQ.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : gateError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6], gap: spacing[3] }}>
          <Lock color={colors.textMuted} size={40} />
          <Text style={{ color: colors.text, textAlign: 'center', fontWeight: typography.weight.semibold as '600' }}>This space is private</Text>
          <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Join to see its members.</Text>
        </View>
      ) : membersQ.isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
          <Text style={{ color: colors.text }}>Could not load members.</Text>
          <Pressable accessibilityRole="button" onPress={() => membersQ.refetch()}>
            <Text style={{ color: colors.accent }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={membersQ.members}
          keyExtractor={(m) => String(m.user_id)}
          renderItem={({ item }) => (
            <MemberRow
              member={item}
              canManage={membership.isAdmin}
              isSelf={item.user_id === me?.user_id}
              busy={updateRole.isPending || leave.isPending}
              onChangeRole={(role: SpaceRole) => updateRole.mutate({ userId: item.user_id, role })}
              onKick={() => leave.mutate(item.user_id)}
            />
          )}
          contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[8] }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (membersQ.hasNextPage && !membersQ.isFetchingNextPage) membersQ.fetchNextPage();
          }}
          ListHeaderComponent={
            <View style={{ gap: spacing[3], marginBottom: spacing[3] }}>
              {/* Managed by */}
              {(privilegedQ.data?.length ?? 0) > 0 ? (
                <View style={{ gap: spacing[2] }}>
                  <Text style={{ color: colors.textMuted, fontSize: typography.size.xs, fontWeight: typography.weight.bold as '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Managed by
                  </Text>
                  <FlatList
                    horizontal
                    data={privilegedQ.data ?? []}
                    keyExtractor={(p) => String(p.user_id)}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: spacing[3] }}
                    renderItem={({ item }) => (
                      <View style={{ alignItems: 'center', gap: 4, width: 64 }}>
                        {item.avatar_url ? (
                          <Image source={{ uri: item.avatar_url }} style={{ width: 44, height: 44, borderRadius: radius.full }} />
                        ) : (
                          <View style={{ width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.bgSubtle }} />
                        )}
                        <Text numberOfLines={1} style={{ color: colors.text, fontSize: typography.size.xs }}>
                          {item.display_name}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 10, textTransform: 'capitalize' }}>{item.role}</Text>
                      </View>
                    )}
                  />
                </View>
              ) : null}

              {/* Join requests (privileged only) */}
              {membership.isPrivileged && requests.length > 0 ? (
                <View style={{ gap: spacing[2] }}>
                  <Text style={{ color: colors.textMuted, fontSize: typography.size.xs, fontWeight: typography.weight.bold as '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Pending requests ({requestsQ.data?.meta.total ?? requests.length})
                  </Text>
                  {requests.map((r: JoinRequest) => (
                    <RequestRow
                      key={r.id}
                      request={r}
                      busy={approve.isPending || deny.isPending}
                      onApprove={() => approve.mutate(r.id)}
                      onDeny={() => deny.mutate(r.id)}
                    />
                  ))}
                </View>
              ) : null}

              <Text style={{ color: colors.textMuted, fontSize: typography.size.xs, fontWeight: typography.weight.bold as '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                All members
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: spacing[10] }}>
              <Text style={{ color: colors.textMuted }}>No members yet.</Text>
            </View>
          }
          ListFooterComponent={
            membersQ.isFetchingNextPage ? (
              <View style={{ paddingVertical: spacing[4] }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function RequestRow({
  request,
  busy,
  onApprove,
  onDeny,
}: {
  request: JoinRequest;
  busy: boolean;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        padding: spacing[3],
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
      }}
    >
      {request.avatar_url ? (
        <Image source={{ uri: request.avatar_url }} style={{ width: 36, height: 36, borderRadius: radius.full }} />
      ) : (
        <View style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.bgSubtle }} />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: typography.size.sm, fontWeight: typography.weight.medium as '500' }}>
          {request.display_name}
        </Text>
        {request.message ? (
          <Text numberOfLines={2} style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
            {request.message}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Approve ${request.display_name}`}
        onPress={onApprove}
        disabled={busy}
        style={{ minHeight: 36, paddingHorizontal: spacing[3], borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}
      >
        <Text style={{ color: colors.accentFg, fontSize: typography.size.sm, fontWeight: typography.weight.semibold as '600' }}>Approve</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Deny ${request.display_name}`}
        onPress={onDeny}
        disabled={busy}
        hitSlop={6}
        style={{ minHeight: 36, paddingHorizontal: spacing[2], alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}
      >
        <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>Deny</Text>
      </Pressable>
    </View>
  );
}
