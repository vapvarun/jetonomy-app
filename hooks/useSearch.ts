// hooks/useSearch.ts — search (single ranked page), similar-topics typeahead, tag list.

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { search, type SearchRow } from '@/api/search';
import { listTags } from '@/api/tags';
import type { ListEnvelope } from '@/types/api';
import type {
  SearchAllResponse,
  SearchParams,
  SearchPostRow,
} from '@/types/search';
import type { Tag } from '@/types/tag';

/** Typed-mode search (post|reply|space|tag). */
export function useSearch(params: SearchParams) {
  return useQuery<ListEnvelope<SearchRow>, Error>({
    queryKey: ['search', params],
    queryFn: () =>
      search({ ...params, type: (params.type ?? 'post') as 'post' }),
    enabled: params.q.trim().length >= 2,
    placeholderData: keepPreviousData,
  });
}

/** Combined `all` search (posts + spaces + tags). */
export function useSearchAll(params: Omit<SearchParams, 'type'>) {
  return useQuery<SearchAllResponse, Error>({
    queryKey: ['search', 'all', params],
    queryFn: () => search({ ...params, type: 'all' }),
    enabled: params.q.trim().length >= 2,
    placeholderData: keepPreviousData,
  });
}

/** Similar-topics typeahead under the compose title. */
export function useSimilarTopics(title: string) {
  return useQuery<SearchPostRow[], Error>({
    queryKey: ['similar', title],
    queryFn: () =>
      search({ q: title, type: 'post', sort: 'relevance' }).then(
        (r) => r.data as SearchPostRow[]
      ),
    enabled: title.trim().length >= 5,
    placeholderData: keepPreviousData,
  });
}

export function useTags(sort: 'popular' | 'alphabetical' = 'popular') {
  return useQuery<Tag[], Error>({
    queryKey: ['tags', sort],
    queryFn: () => listTags({ sort }).then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}
