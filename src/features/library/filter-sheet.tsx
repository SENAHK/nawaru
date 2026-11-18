import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ChoiceChip } from '@/components/choice-chip';
import { Sheet } from '@/components/sheet';
import { categories, dosageSchemes } from '@/db/enums';
import { categoryLabels, schemeLabels } from '@/lib/labels';
import { space } from '@/theme';

import { activeFilterCount, noFilters, type LibraryExercise, type LibraryFilters } from './filter';

type FilterSheetProps = {
  visible: boolean;
  exercises: LibraryExercise[];
  filters: LibraryFilters;
  onChange: (filters: LibraryFilters) => void;
  onClose: () => void;
};

const toggle = <T,>(values: T[], value: T) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

// FilterSheet (docs/screens.md S11): AND between groups, OR inside a group.
export function FilterSheet({ visible, exercises, filters, onChange, onClose }: FilterSheetProps) {
  // Only offer muscles and equipment the library actually uses.
  const muscles = unique(exercises.flatMap((item) => item.muscles));
  const equipment = unique(exercises.flatMap((item) => item.equipment));

  return (
    <Sheet
      visible={visible}
      title="Filters"
      onClose={onClose}
      footer={
        activeFilterCount(filters) > 0 ? (
          <Button title="Clear" variant="ghost" onPress={() => onChange(noFilters)} />
        ) : null
      }>
      <Group title="Favorites">
        <ChoiceChip
          label="Favorites only"
          selected={filters.favoritesOnly}
          onPress={() => onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })}
        />
      </Group>

      <Group title="Category">
        {categories.map((category) => (
          <ChoiceChip
            key={category}
            label={categoryLabels[category]}
            selected={filters.categories.includes(category)}
            onPress={() => onChange({ ...filters, categories: toggle(filters.categories, category) })}
          />
        ))}
      </Group>

      <Group title="Structure">
        {dosageSchemes.map((scheme) => (
          <ChoiceChip
            key={scheme}
            label={schemeLabels[scheme]}
            selected={filters.schemes.includes(scheme)}
            onPress={() => onChange({ ...filters, schemes: toggle(filters.schemes, scheme) })}
          />
        ))}
      </Group>

      <Group title="Muscles">
        {muscles.map((muscle) => (
          <ChoiceChip
            key={muscle.id}
            label={muscle.name}
            selected={filters.muscles.includes(muscle.id)}
            onPress={() => onChange({ ...filters, muscles: toggle(filters.muscles, muscle.id) })}
          />
        ))}
      </Group>

      <Group title="Equipment">
        {equipment.map((gear) => (
          <ChoiceChip
            key={gear.id}
            label={gear.name}
            selected={filters.equipment.includes(gear.id)}
            onPress={() => onChange({ ...filters, equipment: toggle(filters.equipment, gear.id) })}
          />
        ))}
      </Group>
    </Sheet>
  );
}

function unique<T extends { id: string; name: string }>(items: T[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <AppText variant="label" color="textSecondary">
        {title}
      </AppText>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
