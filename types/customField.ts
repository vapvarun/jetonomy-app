// types/customField.ts — Pro custom-field shapes (People domain 04 · [PRO]).
// Source: jetonomy-pro custom-fields extension (registers on jetonomy/v1).

export interface FieldDef {
  id: number;
  name: string;
  slug: string;
  /** text | textarea | select | url | number | date | ... */
  field_type: string;
  /** 'user' | 'post' (which entity the field attaches to). */
  context: string;
  description: string | null;
  placeholder: string | null;
  /** select options — either a plain list or a value→label map. */
  options: string[] | Record<string, string>;
  default_value: string | null;
  is_required: boolean;
  is_searchable: boolean;
  is_filterable: boolean;
  space_id: number | null;
  sort_order: number;
}

/** A resolved value for a field, keyed by slug in the values map. */
export interface FieldValue {
  name: string;
  type: string;
  value: string | null;
  options: unknown[];
}

/** GET /users/{id}/fields → { data: Record<slug, FieldValue> }. */
export type FieldValueMap = Record<string, FieldValue>;
