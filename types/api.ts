// types/api.ts — shared list envelope + pagination meta.
//
// Documented as foundation-owned in the micro-plans, but A0 did not ship it;
// Content (02) is the first wave that needs it, so it is created here and
// consumed unchanged by Spaces (03) and every other list-returning domain.
// Source of truth: `Base_Controller::paginated_response` (Jetonomy plugin).

/** Pagination metadata returned by `paginated_response`. */
export interface ListMeta {
  /** Items in THIS page. */
  count: number;
  /** (offset + count) < total. */
  has_more: boolean;
  /** Last item id in page → pass as `after` for the next page. */
  cursor_next: number | null;
  /** Total across all pages (also mirrored in X-WP-Total header). */
  total?: number;
  /** Echoed back for offset-mode jump-to-page. */
  offset?: number;
}

/** Standard `{ data, meta }` envelope for every list endpoint. */
export interface ListEnvelope<T> {
  data: T[];
  meta: ListMeta;
}
