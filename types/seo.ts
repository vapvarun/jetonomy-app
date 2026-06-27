// types/seo.ts — per-space SEO editor shape (Pro seo-pro).

/** GET/PATCH /spaces/{id}/seo. */
export interface SpaceSeo {
  title: string;
  description: string;
  og_image: string | null;
  canonical: string;
  robots: string;
  [k: string]: unknown;
}

/** Body for PATCH /spaces/{id}/seo (all fields optional). */
export type UpdateSpaceSeoBody = Partial<SpaceSeo>;
