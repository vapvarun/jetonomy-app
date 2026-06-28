// utils/dedupe.ts — stable de-duplication for flattened infinite-query lists.
//
// Offset- and cursor-paginated lists can return the same row on two pages when
// the underlying data shifts between fetches (a new post bumps the ordering, a
// reaction changes a sort key, etc.). Rendering duplicates collides React keys
// ("two children with the same key") and double-paints rows. Keep the FIRST
// occurrence in page order and drop later repeats.
//
// Mirrors the long-standing `dedupeById` guard in hooks/usePosts.ts, generalised
// so every list-owning hook can share one implementation.

export function dedupeBy<T>(
  items: T[],
  key: (item: T) => string | number
): T[] {
  const seen = new Set<string | number>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}
