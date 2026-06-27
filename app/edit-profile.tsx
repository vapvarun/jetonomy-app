// app/edit-profile.tsx — edit own display_name, bio, avatar, email_opt_out, and
// (Pro) custom profile fields. Avatar uses the canonical uploadMedia() helper.

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera } from 'lucide-react-native';

import { uploadMedia } from '@/api/media';
import { toApiError } from '@/api/client';
import {
  useMe,
  useUpdateMe,
  useFieldDefs,
  useUserFields,
  useUpdateMyFields,
} from '@/hooks/useProfile';
import { useFeatures } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import type { FieldDef, FieldValue } from '@/types/customField';

export default function EditProfileScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { custom_fields } = useFeatures();

  const { data: me, isLoading } = useMe();
  const updateMe = useUpdateMe();
  const updateFields = useUpdateMyFields();

  const fieldDefs = useFieldDefs('user');
  const userFields = useUserFields(me?.id ?? null);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [emailOptOut, setEmailOptOut] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed from the loaded profile once.
  useEffect(() => {
    if (!me) return;
    setDisplayName(me.display_name ?? '');
    setBio(me.bio ?? '');
    setAvatarUrl(me.avatar_url ?? null);
    setEmailOptOut(!!me.email_opt_out);
  }, [me]);

  // Seed Pro field values once loaded.
  useEffect(() => {
    if (!userFields.data) return;
    const seed: Record<string, string> = {};
    for (const [slug, v] of Object.entries(userFields.data) as [string, FieldValue][]) {
      seed[slug] = v.value ?? '';
    }
    setFieldValues(seed);
  }, [userFields.data]);

  const saving = updateMe.isPending || updateFields.isPending || uploading;

  const pickAvatar = async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo permission is required to change your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    try {
      setUploading(true);
      const media = await uploadMedia(result.assets[0].uri, { alt: displayName });
      setAvatarUrl(media.url);
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    setError(null);
    try {
      await updateMe.mutateAsync({
        display_name: displayName.trim(),
        bio,
        avatar_url: avatarUrl ?? undefined,
        email_opt_out: emailOptOut,
      });
      if (custom_fields && Object.keys(fieldValues).length > 0) {
        const payload: Record<string, string | null> = {};
        for (const [slug, val] of Object.entries(fieldValues)) {
          payload[slug] = val === '' ? null : val;
        }
        await updateFields.mutateAsync(payload);
      }
      router.back();
    } catch (e) {
      setError(toApiError(e).message);
    }
  };

  const defs = useMemo<FieldDef[]>(() => fieldDefs.data ?? [], [fieldDefs.data]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[3],
          paddingBottom: spacing[2],
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={colors.text} size={24} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold as '600', flex: 1 }}>
          Edit Profile
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Save" onPress={onSave} disabled={saving} hitSlop={8}>
          {saving ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={{ color: colors.accent, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>Save</Text>
          )}
        </Pressable>
      </View>

      {isLoading || !me ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing[4], gap: spacing[5], paddingBottom: insets.bottom + spacing[12] }}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View style={{ backgroundColor: colors.danger, borderRadius: radius.md, padding: spacing[3] }}>
              <Text style={{ color: colors.dangerFg, fontSize: typography.size.sm }}>{error}</Text>
            </View>
          ) : null}

          {/* Avatar */}
          <View style={{ alignItems: 'center', gap: spacing[2] }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={pickAvatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: 96, height: 96, borderRadius: radius.full }} />
              ) : (
                <View style={{ width: 96, height: 96, borderRadius: radius.full, backgroundColor: colors.bgSubtle, alignItems: 'center', justifyContent: 'center' }}>
                  <Camera color={colors.textMuted} size={28} />
                </View>
              )}
            </Pressable>
            <Pressable onPress={pickAvatar} accessibilityRole="button">
              <Text style={{ color: colors.accent, fontSize: typography.size.sm }}>
                {uploading ? 'Uploading…' : 'Change photo'}
              </Text>
            </Pressable>
          </View>

          <Field label="Display name">
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              style={inputStyle(colors, spacing, radius, typography)}
            />
          </Field>

          <Field label="Bio">
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell the community about yourself"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              style={[inputStyle(colors, spacing, radius, typography), { minHeight: 96, textAlignVertical: 'top' }]}
            />
          </Field>

          {/* Email opt-out */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: spacing[3] }}>
              <Text style={{ color: colors.text, fontSize: typography.size.base }}>Opt out of emails</Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>Stop all community email notifications.</Text>
            </View>
            <Switch
              value={emailOptOut}
              onValueChange={setEmailOptOut}
              trackColor={{ true: colors.accent, false: colors.border }}
              accessibilityLabel="Opt out of emails"
            />
          </View>

          {/* Pro custom fields */}
          {custom_fields && defs.length > 0 ? (
            <View style={{ gap: spacing[4] }}>
              <Text style={{ color: colors.text, fontSize: typography.size.base, fontWeight: typography.weight.semibold as '600' }}>
                Profile details
              </Text>
              {defs.map((def) => (
                <Field key={def.id} label={def.name}>
                  <TextInput
                    value={fieldValues[def.slug] ?? ''}
                    onChangeText={(t) => setFieldValues((p) => ({ ...p, [def.slug]: t }))}
                    placeholder={def.placeholder ?? ''}
                    placeholderTextColor={colors.textMuted}
                    keyboardType={def.field_type === 'number' ? 'numeric' : def.field_type === 'url' ? 'url' : 'default'}
                    autoCapitalize={def.field_type === 'url' ? 'none' : 'sentences'}
                    multiline={def.field_type === 'textarea'}
                    style={[
                      inputStyle(colors, spacing, radius, typography),
                      def.field_type === 'textarea' ? { minHeight: 80, textAlignVertical: 'top' } : null,
                    ]}
                  />
                  {def.description ? (
                    <Text style={{ color: colors.textMuted, fontSize: typography.size.xs, marginTop: 4 }}>{def.description}</Text>
                  ) : null}
                </Field>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ gap: spacing[2] }}>
      <Text style={{ color: colors.text, fontSize: typography.size.sm, fontWeight: typography.weight.medium as '500' }}>{label}</Text>
      {children}
    </View>
  );
}

function inputStyle(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  radius: ReturnType<typeof useTheme>['radius'],
  typography: ReturnType<typeof useTheme>['typography']
) {
  return {
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: typography.size.base,
  } as const;
}
