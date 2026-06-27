// app/post/edit/[id].tsx — edit an existing post (PATCH changed fields only).
// Publishes a draft when status === 'draft'.

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import Composer from '@/components/Composer';
import { usePost, useUpdatePost, usePublishDraft } from '@/hooks/usePosts';
import { useCurrentUser } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import type { UpdatePostBody } from '@/api/posts';

function canModerate(me: ReturnType<typeof useCurrentUser>): boolean {
  if (!me) return false;
  const v = me as Record<string, unknown>;
  return Boolean(v.can_moderate || v.is_moderator || v.is_admin);
}

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useCurrentUser();

  const postQ = usePost(postId);
  const post = postQ.data;
  const updatePost = useUpdatePost(postId);
  const publishDraft = usePublishDraft(postId);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (post && !seeded) {
      setTitle(post.title ?? '');
      setBody(post.content_plain ?? '');
      setIsPrivate(post.is_private);
      setSeeded(true);
    }
  }, [post, seeded]);

  if (postQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }
  if (postQ.isError || !post) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing[6] }}>
        <Text style={{ color: colors.text }}>Could not load this post.</Text>
      </View>
    );
  }

  const isAuthor = !!me && post.author_id === me.user_id;
  if (!isAuthor && !canModerate(me)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[6] }}>
        <Text style={{ color: colors.text, fontSize: typography.size.base }}>You can only edit your own posts.</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={{ color: colors.accent }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  function save() {
    setError(null);
    const body_changes: UpdatePostBody = {};
    if (title.trim() !== (post!.title ?? '')) body_changes.title = title.trim();
    if (body.trim() !== (post!.content_plain ?? '')) body_changes.content = body.trim();
    if (isPrivate !== post!.is_private) body_changes.is_private = isPrivate;
    if (Object.keys(body_changes).length === 0) {
      router.back();
      return;
    }
    updatePost.mutate(body_changes, {
      onSuccess: () => router.replace(`/post/${postId}`),
      onError: (e) => setError(e.message),
    });
  }

  const isDraft = post.status === 'draft';

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
        <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>Edit post</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: insets.bottom + spacing[12] }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: spacing[2] }}>
          <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={colors.textMuted}
            style={{ backgroundColor: colors.bgSubtle, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing[3], color: colors.text, fontSize: typography.size.base }}
          />
        </View>

        <View style={{ gap: spacing[2] }}>
          <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>Body</Text>
          <Composer
            value={body}
            onChangeText={setBody}
            onSubmit={save}
            submitting={updatePost.isPending}
            submitLabel="Save"
            spaceId={post.space_id}
            minHeight={160}
            error={error}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontSize: typography.size.base }}>Private post</Text>
          <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: colors.accent }} />
        </View>

        {isDraft ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => publishDraft.mutate(undefined, { onSuccess: () => router.replace(`/post/${postId}`), onError: (e) => setError(e.message) })}
            disabled={publishDraft.isPending}
            style={{ backgroundColor: colors.success, borderRadius: radius.md, paddingVertical: spacing[3], alignItems: 'center' }}
          >
            <Text style={{ color: colors.successFg, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>
              {publishDraft.isPending ? 'Publishing…' : 'Publish draft'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
