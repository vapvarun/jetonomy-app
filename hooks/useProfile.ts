// hooks/useProfile.ts — React Query for current user, public profiles, posts,
// profile update, and Pro fields/badges (gated by features.*).

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  getMe,
  getUser,
  getUserByLogin,
  getUserPosts,
  updateMe,
  type UpdateMeInput,
} from '@/api/users';
import { getUserFields, updateMyFields, listFields } from '@/api/fields';
import { getUserBadges, listBadges } from '@/api/badges';
import { useFeatures } from '@/stores/authStore';
import type { ListEnvelope } from '@/types/api';
import type { Post } from '@/types/post';
import type { Me, PublicUser } from '@/types/user';
import type { FieldDef, FieldValueMap } from '@/types/customField';
import type { Badge, UserBadge } from '@/types/badge';

const PAGE_LIMIT = 20;

/** Current member (settings/email_opt_out seed edit + settings screens). */
export function useMe() {
  return useQuery<Me, Error>({
    queryKey: ['me'],
    queryFn: () => getMe(),
    staleTime: 30_000,
  });
}

/** Public profile by id. */
export function useUser(id: number | null) {
  return useQuery<PublicUser, Error>({
    queryKey: ['user', id],
    enabled: id != null,
    queryFn: () => getUser(id as number),
  });
}

/** Public profile by handle. */
export function useUserByLogin(login: string | null) {
  return useQuery<PublicUser, Error>({
    queryKey: ['user', 'by-login', login],
    enabled: !!login,
    queryFn: () => getUserByLogin(login as string),
  });
}

/** A member's posts (reuses Content 02's Post shape). */
export function useUserPosts(id: number | null) {
  const query = useInfiniteQuery<ListEnvelope<Post>, Error>({
    queryKey: ['user', id, 'posts'],
    enabled: id != null,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getUserPosts(id as number, { limit: PAGE_LIMIT, offset: pageParam as number }),
    getNextPageParam: (last, pages) => {
      if (!last.meta.has_more) return undefined;
      return pages.reduce((n, p) => n + p.data.length, 0);
    },
  });
  const posts: Post[] = query.data?.pages.flatMap((p) => p.data) ?? [];
  return { ...query, posts };
}

/** PATCH /users/me — updates the profile + the cached ['me'] + active session. */
export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation<Me, Error, UpdateMeInput>({
    mutationFn: (body) => updateMe(body),
    onSuccess: (me) => {
      qc.setQueryData(['me'], me);
      qc.invalidateQueries({ queryKey: ['user', me.id] });
    },
  });
}

// ---------------------------------------------------------------------------
// Pro — custom fields. Gated by features.custom_fields; hooks short-circuit
// (enabled:false) when the flag is off so the module is never called.
// ---------------------------------------------------------------------------

export function useUserFields(id: number | null) {
  const { custom_fields } = useFeatures();
  return useQuery<FieldValueMap, Error>({
    queryKey: ['user', id, 'fields'],
    enabled: custom_fields && id != null,
    queryFn: () => getUserFields(id as number).then((r) => r.data),
  });
}

export function useFieldDefs(context = 'user', spaceId?: number) {
  const { custom_fields } = useFeatures();
  return useQuery<FieldDef[], Error>({
    queryKey: ['fields', context, spaceId ?? null],
    enabled: custom_fields,
    queryFn: () => listFields({ context, space_id: spaceId }).then((r) => r.data),
  });
}

export function useUpdateMyFields() {
  const qc = useQueryClient();
  return useMutation<FieldValueMap, Error, Record<string, string | null>>({
    mutationFn: (values) => updateMyFields(values).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Pro — badges. Gated by features.badges.
// ---------------------------------------------------------------------------

export function useUserBadges(id: number | null) {
  const { badges } = useFeatures();
  return useQuery<UserBadge[], Error>({
    queryKey: ['user', id, 'badges'],
    enabled: badges && id != null,
    queryFn: () => getUserBadges(id as number).then((r) => r.data),
  });
}

export function useBadgeCatalog() {
  const { badges } = useFeatures();
  return useQuery<Badge[], Error>({
    queryKey: ['badges', 'catalog'],
    enabled: badges,
    queryFn: () => listBadges({ per_page: 100 }).then((r) => r.data),
  });
}
