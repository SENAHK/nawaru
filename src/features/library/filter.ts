// Library search, filters and grouping (docs/screens.md S11). Pure.

import type { Category, DosageScheme, MuscleRole } from '@/db/enums';
import { categories } from '@/db/enums';
import { categoryLabels } from '@/lib/labels';

export type LibraryExercise = {
  id: string;
  name: string;
  category: Category;
  scheme: DosageScheme;
  muscles: { id: string; name: string; role: MuscleRole }[];
  equipment: { id: string; name: string }[];
  favorite: boolean;
};

export type LibraryFilters = {
  categories: Category[];
  muscles: string[];
  equipment: string[];
  schemes: DosageScheme[];
  favoritesOnly: boolean;
};

export const noFilters: LibraryFilters = {
  categories: [],
  muscles: [],
  equipment: [],
  schemes: [],
  favoritesOnly: false,
};

/** Number of active filter groups' values, for the badge on "Filters". */
export function activeFilterCount(filters: LibraryFilters): number {
  return (
    filters.categories.length +
    filters.muscles.length +
    filters.equipment.length +
    filters.schemes.length +
    (filters.favoritesOnly ? 1 : 0)
  );
}

/** Case- and accent-insensitive search key. */
export const searchKey = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const anyOf = <T>(selected: T[], values: T[]) =>
  selected.length === 0 || values.some((value) => selected.includes(value));

/** AND between groups, OR inside a group. */
export function filterExercises(
  exercises: LibraryExercise[],
  query: string,
  filters: LibraryFilters,
): LibraryExercise[] {
  const key = searchKey(query);
  return exercises.filter(
    (item) =>
      (!key || searchKey(item.name).includes(key)) &&
      anyOf(filters.categories, [item.category]) &&
      anyOf(filters.schemes, [item.scheme]) &&
      anyOf(filters.muscles, item.muscles.map((muscle) => muscle.id)) &&
      anyOf(filters.equipment, item.equipment.map((gear) => gear.id)) &&
      (!filters.favoritesOnly || item.favorite),
  );
}

export type Grouping = 'category' | 'muscle' | 'alpha';

export type LibrarySection = { key: string; title: string; data: LibraryExercise[] };

/**
 * Sections for the list. By muscle, an exercise appears under each of its
 * primary muscles; A–Z groups by first letter.
 */
export function groupExercises(exercises: LibraryExercise[], grouping: Grouping): LibrarySection[] {
  const sorted = [...exercises].sort((a, b) => a.name.localeCompare(b.name));
  if (grouping === 'category') {
    return categories
      .map((category) => ({
        key: category,
        title: categoryLabels[category],
        data: sorted.filter((item) => item.category === category),
      }))
      .filter((section) => section.data.length > 0);
  }

  const groups = new Map<string, LibraryExercise[]>();
  for (const item of sorted) {
    const keys =
      grouping === 'alpha'
        ? [searchKey(item.name).charAt(0).toUpperCase() || '#']
        : item.muscles.filter((muscle) => muscle.role === 'primary').map((muscle) => muscle.name);
    for (const key of keys.length > 0 ? keys : ['Other']) {
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))
    .map(([key, data]) => ({ key, title: key, data }));
}
