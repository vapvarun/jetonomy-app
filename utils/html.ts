// utils/html.ts — WP HTML content helpers.
// WP post/reply/bio content is HTML. `stripHtml` makes plain-text previews for
// list rows and notifications; `renderHtml` returns the prop bag a renderer
// component (e.g. react-native-render-html) consumes.

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'",
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&hellip;': '…',
  '&mdash;': '-',
  '&ndash;': '-',
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_m, code: string) =>
      String.fromCharCode(parseInt(code, 10))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_m, code: string) =>
      String.fromCharCode(parseInt(code, 16))
    )
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m] ?? m);
}

/** Strip all tags + collapse whitespace; optional length cap with ellipsis. */
export function stripHtml(html: string | null | undefined, maxLength?: number): string {
  if (!html) return '';
  const text = decodeEntities(
    html
      .replace(/<\/(p|div|br|li|h[1-6])>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim();
  if (maxLength && text.length > maxLength) {
    return text.slice(0, maxLength).trimEnd() + '…';
  }
  return text;
}

export interface RenderHtmlProps {
  html: string;
}

/**
 * Returns the prop bag for an HTML renderer. Kept minimal + renderer-agnostic so
 * Content domain can pass it straight into react-native-render-html's `source`.
 */
export function renderHtml(html: string | null | undefined): RenderHtmlProps {
  return { html: html ?? '' };
}
