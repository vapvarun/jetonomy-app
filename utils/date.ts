// utils/date.ts — WP timestamp parsing + display.
// WP timestamps are UTC `Y-m-d H:i:s` (no trailing Z). Parse as UTC, then apply
// siteIndex.gmt_offset for display.

/** Parse a WP `Y-m-d H:i:s` (UTC) string into a Date. Returns null on bad input. */
export function parseWpDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  // Already ISO with timezone? Trust it.
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  // `Y-m-d H:i:s` -> treat as UTC.
  const normalized = iso.trim().replace(' ', 'T');
  const d = new Date(`${normalized}Z`);
  return isNaN(d.getTime()) ? null : d;
}

/** Short relative time like "now", "2h", "3d", "5w". */
export function relativeTime(iso: string | null | undefined): string {
  const date = parseWpDate(iso);
  if (!date) return '';
  const diffMs = Date.now() - date.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 45) return 'now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo`;
  const yr = Math.round(day / 365);
  return `${yr}y`;
}

/** Absolute local date string, offset by the site's gmt_offset (hours). */
export function formatDate(
  iso: string | null | undefined,
  gmtOffset = 0
): string {
  const date = parseWpDate(iso);
  if (!date) return '';
  // Shift by the site offset relative to the device's own offset so the wall
  // clock matches the community's timezone regardless of device locale.
  const deviceOffsetMin = -date.getTimezoneOffset();
  const siteOffsetMin = gmtOffset * 60;
  const shifted = new Date(date.getTime() + (siteOffsetMin - deviceOffsetMin) * 60000);
  return shifted.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
