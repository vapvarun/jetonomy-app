// components/PostCard.tsx — feed/list row for a Post.

import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  CheckCircle2,
  Eye,
  Lock,
  MessageSquare,
  Pin,
} from 'lucide-react-native';

import Avatar from '@/components/Avatar';
import { useTheme } from '@/theme/ThemeContext';
import { stripHtml } from '@/utils/html';
import type { IdeaStatus, Post } from '@/types/post';

export interface PostCardProps {
  post: Post;
}

const IDEA_LABELS: Record<IdeaStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  shipped: 'Shipped',
  declined: 'Declined',
};

export default function PostCard({ post }: PostCardProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();

  const excerpt = post.content_plain || stripHtml(post.content, 140);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={post.title || 'Open post'}
      onPress={() => router.push(`/post/${post.id}`)}
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing[4],
        gap: spacing[2],
      }}
    >
      {/* Author + badges row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <Avatar uri={post.author_avatar} name={post.author_name} size={24} />
        <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }} numberOfLines={1}>
          {post.author_name}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>·</Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
          {post.time_ago}
        </Text>
        <View style={{ flex: 1 }} />
        {post.is_sticky ? <Pin color={colors.accent} size={14} /> : null}
        {post.is_closed ? <Lock color={colors.textMuted} size={14} /> : null}
        {post.is_resolved ? <CheckCircle2 color={colors.success} size={14} /> : null}
      </View>

      {/* Prefix + title */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[2] }}>
        {post.prefix ? (
          <View
            style={{
              backgroundColor: post.prefix_color || colors.bgSubtle,
              borderRadius: radius.sm,
              paddingHorizontal: spacing[2],
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: colors.accentFg, fontSize: typography.size.xs, fontWeight: typography.weight.medium as '500' }}>
              {post.prefix}
            </Text>
          </View>
        ) : null}
        {post.idea_status ? (
          <View
            style={{
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.sm,
              paddingHorizontal: spacing[2],
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
              {IDEA_LABELS[post.idea_status as IdeaStatus] ?? post.idea_status}
            </Text>
          </View>
        ) : null}
      </View>

      {post.title ? (
        <Text
          numberOfLines={2}
          style={{
            color: colors.text,
            fontSize: typography.size.lg,
            fontWeight: typography.weight.semibold as '600',
          }}
        >
          {post.title}
        </Text>
      ) : null}

      {excerpt ? (
        <Text numberOfLines={2} style={{ color: colors.textMuted, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm }}>
          {excerpt}
        </Text>
      ) : null}

      {/* Stats row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4], marginTop: spacing[1] }}>
        <Stat icon={<MessageSquare color={colors.textMuted} size={14} />} value={post.reply_count} color={colors.textMuted} />
        <Stat
          icon={<Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>▲</Text>}
          value={post.vote_score}
          color={colors.textMuted}
        />
        <Stat icon={<Eye color={colors.textMuted} size={14} />} value={post.view_count} color={colors.textMuted} />
        <View style={{ flex: 1 }} />
        {post.space_title ? (
          <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }} numberOfLines={1}>
            {post.space_title}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function Stat({ icon, value, color }: { icon: React.ReactNode; value: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {icon}
      <Text style={{ color, fontSize: 12 }}>{value}</Text>
    </View>
  );
}

/** Loading skeleton row matching PostCard height. */
export function PostCardSkeleton() {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing[4],
        gap: spacing[2],
      }}
    >
      <View style={{ height: 16, width: '40%', backgroundColor: colors.bgSubtle, borderRadius: radius.sm }} />
      <View style={{ height: 20, width: '85%', backgroundColor: colors.bgSubtle, borderRadius: radius.sm }} />
      <View style={{ height: 14, width: '60%', backgroundColor: colors.bgSubtle, borderRadius: radius.sm }} />
    </View>
  );
}
