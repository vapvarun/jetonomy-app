// components/Avatar.tsx — user avatar with a graceful fallback.
//
// Renders the avatar image when a usable URL is present; otherwise (empty/null
// URL, or the image fails to load) shows the member's initials on an accent
// circle. Demo users and gravatar-less accounts have no avatar_url, which used
// to render a blank grey dot in every list — this is the single shared fix.

import { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

export interface AvatarProps {
  /** Avatar image URL. Empty string / null → initials fallback. */
  uri?: string | null;
  /** Display name, used for the initials fallback + a11y label. */
  name?: string | null;
  /** Square size in px (diameter). Default 24. */
  size?: number;
}

/** 1–2 letter initials from a display name; '?' when unknown. */
function initialsOf(name?: string | null): string {
  const n = (name ?? '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

export default function Avatar({ uri, name, size = 24 }: AvatarProps) {
  const { colors, radius, typography } = useTheme();
  const [failed, setFailed] = useState(false);

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: radius.full }}
      />
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name ? `${name}'s avatar` : 'Avatar'}
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.accentFg,
          fontSize: Math.max(9, Math.round(size * 0.42)),
          fontWeight: typography.weight.semibold,
        }}
      >
        {initialsOf(name)}
      </Text>
    </View>
  );
}
