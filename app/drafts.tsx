// app/drafts.tsx — the member's unpublished drafts with edit / publish / delete.

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import PostCard from '@/components/PostCard';
import { useDrafts, usePublishDraft, useDeletePost } from '@/hooks/usePosts';
import { useTheme } from '@/theme/ThemeContext';
import type { Post } from '@/types/post';

export default function DraftsScreen() {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: drafts, isLoading, isError, refetch } = useDrafts();

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
        <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>Drafts</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
          <Text style={{ color: colors.text }}>Could not load drafts.</Text>
          <Pressable onPress={() => refetch()} accessibilityRole="button">
            <Text style={{ color: colors.accent }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={drafts ?? []}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => <DraftRow post={item} />}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: insets.bottom + spacing[8] }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: spacing[12] }}>
              <Text style={{ color: colors.textMuted, fontSize: typography.size.base }}>No drafts.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function DraftRow({ post }: { post: Post }) {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const publish = usePublishDraft(post.id);
  const del = useDeletePost(post.id, post.space_id);

  return (
    <View style={{ gap: spacing[2] }}>
      <PostCard post={post} />
      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/post/edit/${post.id}`)}
          style={{ flex: 1, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing[2], alignItems: 'center' }}
        >
          <Text style={{ color: colors.text, fontSize: typography.size.sm }}>Edit</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => publish.mutate()}
          disabled={publish.isPending}
          style={{ flex: 1, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing[2], alignItems: 'center', opacity: publish.isPending ? 0.6 : 1 }}
        >
          <Text style={{ color: colors.accentFg, fontSize: typography.size.sm, fontWeight: typography.weight.semibold as '600' }}>
            {publish.isPending ? 'Publishing…' : 'Publish'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => del.mutate()}
          disabled={del.isPending}
          style={{ flex: 1, borderColor: colors.danger, borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing[2], alignItems: 'center', opacity: del.isPending ? 0.6 : 1 }}
        >
          <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}
