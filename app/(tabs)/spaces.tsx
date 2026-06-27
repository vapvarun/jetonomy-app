// app/(tabs)/spaces.tsx — Discovery hub: category filter chips + paginated
// space grid + client-side search. Big-site safe: the grid is GET /spaces
// (LIMIT/OFFSET cursor pagination), NOT the heavy embedded categories tree.

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Search, X } from 'lucide-react-native';

import SpaceCard, { SpaceCardSkeleton } from '@/components/SpaceCard';
import { useCategories, useCreateSpace, useSpaceList } from '@/hooks/useSpaces';
import { useCurrentUser } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import type { CategoryTreeNode } from '@/types/category';
import type { SpaceJoinPolicy, SpaceVisibility } from '@/types/space';

/** Best-effort create-space capability (server 403 remains source of truth). */
function canCreateSpace(me: ReturnType<typeof useCurrentUser>): boolean {
  if (!me) return false;
  const v = me as Record<string, unknown>;
  const caps = (v.capabilities ?? {}) as Record<string, unknown>;
  return Boolean(
    v.can_create_spaces || v.is_admin || caps.create_spaces || caps.manage_options
  );
}

export default function SpacesScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useCurrentUser();

  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const categoriesQ = useCategories();
  const categories = categoriesQ.data?.data ?? [];

  const {
    spaces,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSpaceList(activeCat != null ? { category_id: activeCat } : {});

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return spaces;
    return spaces.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [spaces, search]);

  const showCreate = canCreateSpace(me);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing[3],
          paddingHorizontal: spacing[4],
          paddingBottom: spacing[3],
          gap: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Text style={{ color: colors.text, fontSize: typography.size['2xl'], fontWeight: typography.weight.bold as '700' }}>
          Spaces
        </Text>

        {/* Search */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            backgroundColor: colors.bgSubtle,
            borderRadius: radius.md,
            paddingHorizontal: spacing[3],
            minHeight: 40,
          }}
        >
          <Search color={colors.textMuted} size={18} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search spaces"
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, color: colors.text, fontSize: typography.size.base, paddingVertical: spacing[2] }}
            returnKeyType="search"
            accessibilityLabel="Search spaces"
          />
        </View>

        {/* Category filter chips */}
        {categories.length > 0 ? (
          <FlatList
            horizontal
            data={[{ id: null as number | null, name: 'All' }, ...categories.map((c: CategoryTreeNode) => ({ id: c.id as number | null, name: c.name }))]}
            keyExtractor={(c) => String(c.id ?? 'all')}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing[2] }}
            renderItem={({ item }) => {
              const active = activeCat === item.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setActiveCat(item.id)}
                  style={{
                    paddingHorizontal: spacing[3],
                    minHeight: 32,
                    justifyContent: 'center',
                    borderRadius: radius.full,
                    backgroundColor: active ? colors.accent : colors.bgSubtle,
                    borderWidth: 1,
                    borderColor: active ? colors.accent : colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: active ? colors.accentFg : colors.textMuted,
                      fontSize: typography.size.sm,
                      fontWeight: typography.weight.medium as '500',
                    }}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        ) : null}
      </View>

      {isLoading ? (
        <View style={{ padding: spacing[4], gap: spacing[3] }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <SpaceCardSkeleton key={i} />
          ))}
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6], gap: spacing[3] }}>
          <Text style={{ color: colors.text, textAlign: 'center' }}>
            {error?.message ?? 'Could not load spaces.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => refetch()}
            style={{ borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[5], paddingVertical: spacing[3] }}
          >
            <Text style={{ color: colors.accent }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(s) => String(s.id)}
          renderItem={({ item }) => <SpaceCard space={item} />}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: insets.bottom + spacing[12] }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accent} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage && !search) fetchNextPage();
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: spacing[12], gap: spacing[2] }}>
              <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>
                {search ? 'No matching spaces' : 'No spaces yet'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.size.base, textAlign: 'center' }}>
                {search ? 'Try a different search.' : 'Spaces will appear here once created.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: spacing[4] }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : null
          }
        />
      )}

      {showCreate ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create space"
          onPress={() => setCreateOpen(true)}
          style={{
            position: 'absolute',
            right: spacing[5],
            bottom: insets.bottom + spacing[5],
            width: 56,
            height: 56,
            borderRadius: radius.full,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
        >
          <Plus color={colors.accentFg} size={26} />
        </Pressable>
      ) : null}

      <CreateSpaceModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          router.push(`/space/${id}`);
        }}
      />
    </View>
  );
}

const VISIBILITY_OPTS: SpaceVisibility[] = ['public', 'private', 'hidden'];
const JOIN_OPTS: SpaceJoinPolicy[] = ['open', 'approval', 'invite'];

function CreateSpaceModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const create = useCreateSpace();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<SpaceVisibility>('public');
  const [joinPolicy, setJoinPolicy] = useState<SpaceJoinPolicy>('open');
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setTitle('');
    setDescription('');
    setVisibility('public');
    setJoinPolicy('open');
    setErr(null);
  }

  function handleSubmit() {
    if (!title.trim()) {
      setErr('Title is required.');
      return;
    }
    setErr(null);
    create.mutate(
      { title: title.trim(), description: description.trim(), visibility, join_policy: joinPolicy },
      {
        onSuccess: (space) => {
          reset();
          onCreated(space.id);
        },
        onError: (e) => setErr((e as { message?: string }).message ?? 'Could not create space.'),
      }
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay }}
      >
        <View
          style={{
            backgroundColor: colors.bg,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            paddingHorizontal: spacing[5],
            paddingTop: spacing[4],
            paddingBottom: insets.bottom + spacing[5],
            gap: spacing[4],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, color: colors.text, fontSize: typography.size.xl, fontWeight: typography.weight.bold as '700' }}>
              New space
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8}>
              <X color={colors.textMuted} size={24} />
            </Pressable>
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Space title"
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
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Space description"
            multiline
            style={{
              color: colors.text,
              fontSize: typography.size.base,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing[3],
              paddingTop: spacing[3],
              minHeight: 72,
            }}
          />

          <OptionRow label="Visibility" value={visibility} options={VISIBILITY_OPTS} onChange={setVisibility} />
          <OptionRow label="Join policy" value={joinPolicy} options={JOIN_OPTS} onChange={setJoinPolicy} />

          {err ? <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>{err}</Text> : null}

          <Pressable
            accessibilityRole="button"
            onPress={handleSubmit}
            disabled={create.isPending}
            style={{
              minHeight: 48,
              borderRadius: radius.md,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: create.isPending ? 0.6 : 1,
            }}
          >
            <Text style={{ color: colors.accentFg, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>
              {create.isPending ? 'Creating…' : 'Create space'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function OptionRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <View style={{ gap: spacing[2] }}>
      <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const active = opt === value;
          return (
            <Pressable
              key={opt}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(opt)}
              style={{
                paddingHorizontal: spacing[3],
                minHeight: 36,
                justifyContent: 'center',
                borderRadius: radius.full,
                backgroundColor: active ? colors.accent : colors.bgSubtle,
                borderWidth: 1,
                borderColor: active ? colors.accent : colors.border,
              }}
            >
              <Text
                style={{
                  color: active ? colors.accentFg : colors.textMuted,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.medium as '500',
                  textTransform: 'capitalize',
                }}
              >
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
