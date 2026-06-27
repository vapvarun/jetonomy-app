// types/linkPreview.ts — Preview_Data::to_array() + oEmbed 1.0.

export interface LinkPreview {
  url: string;
  original_url: string;
  title: string;
  description: string;
  image: string;
  image_alt: string;
  site_name: string;
  domain: string;
  favicon: string;
  type: string;
  provider: string;
  locale: string;
  published_at: string;
  author: string;
  embed_html: string;
}

export interface OEmbed {
  version: '1.0';
  type: 'rich' | 'link';
  title: string;
  author_name: string;
  author_url: string;
  provider_name: string;
  provider_url: string;
  cache_age: number;
  description?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  width?: number;
  height?: number;
  html?: string; // rich only
}
