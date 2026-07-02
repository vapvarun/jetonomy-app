// components/CategoryHeader.tsx — collapsible section header for a category.

import { Pressable, Text, View } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';

import SpaceIcon from '@/components/SpaceIcon';
import { useTheme } from '@/theme/ThemeContext';
import type { Category } from '@/types/category';

export interface CategoryHeaderProps {
  category: Pick<Category, 'name' | 'color' | 'space_count' | 'icon'>;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function CategoryHeader({
  category,
  collapsed = false,
  onToggle,
}: CategoryHeaderProps) {
  const { colors, spacing, typography } = useTheme();
  const accent = isHex(category.color) ? category.color : colors.accent;

  return (
    <Pressable
      accessibilityRole={onToggle ? 'button' : 'header'}
      accessibilityState={onToggle ? { expanded: !collapsed } : undefined}
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[2],
        paddingVertical: spacing[2],
      }}
    >
      <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: accent }} />
      {category.icon ? <SpaceIcon icon={category.icon} size={16} color={accent} /> : null}
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          color: colors.text,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.bold as '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {category.name}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
        {category.space_count}
      </Text>
      {onToggle ? (
        collapsed ? (
          <ChevronRight color={colors.textMuted} size={18} />
        ) : (
          <ChevronDown color={colors.textMuted} size={18} />
        )
      ) : null}
    </Pressable>
  );
}

function isHex(v: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}
