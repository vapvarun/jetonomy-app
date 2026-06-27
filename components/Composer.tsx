// components/Composer.tsx — shared body editor + image attach + submit.
// Image upload delegates to the foundation media api (uploadMedia); the returned
// URL is inserted into the body as markdown so the server renders it.

import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Send } from 'lucide-react-native';

import { uploadMedia } from '@/api/media';
import { toApiError } from '@/api/client';
import { useTheme } from '@/theme/ThemeContext';

export interface ComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
  disabled?: boolean;
  placeholder?: string;
  submitLabel?: string;
  error?: string | null;
  /** Scope uploaded media to a space when known. */
  spaceId?: number;
  minHeight?: number;
  autoFocus?: boolean;
}

export default function Composer({
  value,
  onChangeText,
  onSubmit,
  submitting = false,
  disabled = false,
  placeholder = 'Write something…',
  submitLabel = 'Post',
  error,
  spaceId,
  minHeight = 120,
  autoFocus = false,
}: ComposerProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canSubmit = value.trim().length > 0 && !submitting && !disabled && !uploading;

  async function handleAttach() {
    setUploadError(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setUploadError('Photo library permission is required to attach images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setUploading(true);
      const media = await uploadMedia(asset.uri, {
        spaceId,
        name: asset.fileName ?? undefined,
        type: asset.mimeType ?? undefined,
      });
      const md = `\n![${media.alt ?? ''}](${media.url})\n`;
      onChangeText(value + md);
    } catch (e) {
      setUploadError(toApiError(e).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={{ gap: spacing[2] }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        editable={!disabled && !submitting}
        autoFocus={autoFocus}
        multiline
        textAlignVertical="top"
        style={{
          minHeight,
          backgroundColor: colors.bgSubtle,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing[3],
          color: colors.text,
          fontSize: typography.size.base,
          lineHeight: typography.lineHeight.base,
        }}
      />

      {uploadError || error ? (
        <Text style={{ color: colors.danger, fontSize: typography.size.sm }}>
          {uploadError ?? error}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Attach image"
          onPress={handleAttach}
          disabled={disabled || submitting || uploading}
          hitSlop={8}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[1],
            paddingVertical: spacing[2],
            paddingHorizontal: spacing[3],
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <ImagePlus color={colors.textMuted} size={18} />
          )}
          <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
            {uploading ? 'Uploading…' : 'Image'}
          </Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={submitLabel}
          onPress={onSubmit}
          disabled={!canSubmit}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            backgroundColor: colors.accent,
            borderRadius: radius.md,
            paddingVertical: spacing[2],
            paddingHorizontal: spacing[4],
            opacity: canSubmit ? 1 : 0.5,
          }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.accentFg} />
          ) : (
            <Send color={colors.accentFg} size={16} />
          )}
          <Text
            style={{
              color: colors.accentFg,
              fontSize: typography.size.base,
              fontWeight: typography.weight.semibold as '600',
            }}
          >
            {submitLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
