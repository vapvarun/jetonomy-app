// types/tag.ts — jt_tags row (schema: id,name,slug,post_count).

export interface Tag {
  id: number;
  name: string;
  slug: string;
  post_count: number;
}
