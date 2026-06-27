// app/post/new.tsx — compose a new post. Space picker drives the default post
// type; SimilarTopics warns about duplicates; Composer handles body + images.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react-native';

import Composer from '@/components/Composer';
import SimilarTopics from '@/components/SimilarTopics';
import { listSpacesLite, type SpaceLite } from '@/api/posts';
import { useCreatePost } from '@/hooks/usePosts';
import { useTheme } from '@/theme/ThemeContext';
import type { PostType } from '@/types/post';

const TYPE_OPTIONS: PostType[] = ['topic', 'question', 'discussion', 'idea', 'announcement', 'status'];

function defaultTypeForSpace(spaceType?: string): PostType {
  switch (spaceType) {
    case 'qa':
      return 'question';
    case 'ideas':
      return 'idea';
    case 'feed':
      return 'status';
    default:
      return 'topic';
  }
}

export default function NewPostScreen() {
  const { spaceId: spaceIdParam } = useLocalSearchParams<{ spaceId?: string }>();
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const spacesQ = useQuery({ queryKey: ['spaces', 'lite'], queryFn: () => listSpacesLite() });
  const spaces = useMemo<SpaceLite[]>(() => spacesQ.data ?? [], [spacesQ.data]);

  const [spaceId, setSpaceId] = useState<number | null>(
    spaceIdParam ? Number(spaceIdParam) : null
  );
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<PostType>('topic');
  const [tagsInput, setTagsInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typeTouched = useRef(false);

  // Default-select the first space + derive default type when spaces arrive.
  useEffect(() => {
    if (spaceId == null && spaces.length) setSpaceId(spaces[0].id);
  }, [spaces, spaceId]);

  const selectedSpace = spaces.find((s) => s.id === spaceId);
  useEffect(() => {
    if (!typeTouched.current && selectedSpace) {
      setType(defaultTypeForSpace(selectedSpace.type));
    }
  }, [selectedSpace]);

  const isFeedSpace = selectedSpace?.type === 'feed';
  const createPost = useCreatePost(spaceId ?? 0);

  function submit(status: 'publish' | 'draft') {
    setError(null);
    if (spaceId == null) {
      setError('Choose a space first.');
      return;
    }
    if (!body.trim()) {
      setError('Write something before posting.');
      return;
    }
    const tags = tagsInput
      .split(/[,\s]+/)
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);
    createPost.mutate(
      {
        content: body.trim(),
        title: isFeedSpace ? undefined : title.trim() || undefined,
        type,
        tags: tags.length ? tags : undefined,
        is_private: isPrivate || undefined,
        status,
      },
      {
        onSuccess: (post) => router.replace(`/post/${post.id}`),
        onError: (e) => setError(e.message),
      }
    );
  }

  const labelStyle = { color: colors.textMuted, fontSize: typography.size.sm, fontWeight: typography.weight.medium as '500' } as const;

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
        <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600' }}>New post</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: insets.bottom + spacing[12] }} keyboardShouldPersistTaps="handled">
        {/* Space picker */}
        <View style={{ gap: spacing[2] }}>
          <Text style={labelStyle}>Space</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
            {spaces.map((s) => {
              const active = s.id === spaceId;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSpaceId(s.id)}
                  style={{
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[2],
                    borderRadius: radius.full,
                    backgroundColor: active ? colors.accent : colors.bgSubtle,
                    borderWidth: 1,
                    borderColor: active ? colors.accent : colors.border,
                  }}
                >
                  <Text style={{ color: active ? colors.accentFg : colors.text, fontSize: typography.size.sm }}>{s.title}</Text>
                </Pressable>
              );
            })}
            {spaces.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
                {spacesQ.isLoading ? 'Loading spaces…' : 'No spaces available.'}
              </Text>
            ) : null}
          </ScrollView>
        </View>

        {/* Type picker */}
        <View style={{ gap: spacing[2] }}>
          <Text style={labelStyle}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
            {TYPE_OPTIONS.map((t) => {
              const active = t === type;
              return (
                <Pressable
                  key={t}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    typeTouched.current = true;
                    setType(t);
                  }}
                  style={{
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[1],
                    borderRadius: radius.full,
                    backgroundColor: active ? colors.accent : colors.bgSubtle,
                    borderWidth: 1,
                    borderColor: active ? colors.accent : colors.border,
                  }}
                >
                  <Text style={{ color: active ? colors.accentFg : colors.textMuted, fontSize: typography.size.sm }}>{t}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Title (omitted for feed spaces) */}
        {!isFeedSpace ? (
          <View style={{ gap: spacing[2] }}>
            <Text style={labelStyle}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="A clear, specific title"
              placeholderTextColor={colors.textMuted}
              style={{ backgroundColor: colors.bgSubtle, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing[3], color: colors.text, fontSize: typography.size.base }}
            />
            <SimilarTopics title={title} />
          </View>
        ) : null}

        {/* Body */}
        <View style={{ gap: spacing[2] }}>
          <Text style={labelStyle}>Body</Text>
          <Composer
            value={body}
            onChangeText={setBody}
            onSubmit={() => submit('publish')}
            submitting={createPost.isPending}
            submitLabel="Publish"
            placeholder="Share your thoughts…"
            error={error}
            spaceId={spaceId ?? undefined}
            minHeight={160}
          />
        </View>

        {/* Tags */}
        <View style={{ gap: spacing[2] }}>
          <Text style={labelStyle}>Tags</Text>
          <TextInput
            value={tagsInput}
            onChangeText={setTagsInput}
            placeholder="comma or space separated"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={{ backgroundColor: colors.bgSubtle, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing[3], color: colors.text, fontSize: typography.size.base }}
          />
        </View>

        {/* Private toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontSize: typography.size.base }}>Private post</Text>
          <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: colors.accent }} />
        </View>

        {/* Save as draft */}
        <Pressable
          accessibilityRole="button"
          onPress={() => submit('draft')}
          disabled={createPost.isPending}
          style={{ borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing[3], alignItems: 'center' }}
        >
          <Text style={{ color: colors.text, fontSize: typography.size.base }}>Save as draft</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
