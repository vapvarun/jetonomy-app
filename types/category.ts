// types/category.ts — `Categories_Controller::prepare_category()`.

import type { Space, SpaceVisibility } from '@/types/space';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent_id: number | null;
  icon: string;
  /** hex or token. */
  color: string;
  visibility: SpaceVisibility;
  sort_order: number;
  space_count: number;
  created_at: string | null;
}

/** GET /categories nests extras on each top-level node. */
export interface CategoryTreeNode extends Category {
  /** Space::list_by_category() raw rows (NOT paginated). */
  spaces: Space[];
  /** recursive. */
  children: CategoryTreeNode[];
}

/** GET /categories/{id} → Category + embedded spaces. */
export interface CategoryWithSpaces extends Category {
  spaces: Space[];
}
