import { ChevronRight, Search, SlidersHorizontal, Star } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ListItem } from '@/components/list-item';
import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { getLibrary, toggleFavorite } from '@/db/queries/library';
import { useDbQuery } from '@/db/use-db-version';
import { schemeLabels } from '@/lib/labels';
import { categoryColors, radius, space, touch, useTheme } from '@/theme';

import {
  activeFilterCount,
  filterExercises,
  groupExercises,
  noFilters,
  type Grouping,
  type LibraryExercise,
  type LibraryFilters,
  type LibrarySection,
} from './filter';
import { FilterSheet } from './filter-sheet';

type LibraryListProps = {
  /** Opens the detail (Library tab) or picks the exercise (selection mode, S6). */
  onPress: (exercise: LibraryExercise) => void;
  /** Bottom padding for the list (tab bar, home indicator). */
  bottomInset?: number;
};

// S11 list: search, filters, grouping, favourites. Shared by the Library tab
// and the exercise picker.
export function LibraryList({ onPress, bottomInset = 0 }: LibraryListProps) {
  const { colors } = useTheme();
  const exercises = useDbQuery(getLibrary, 'library');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<LibraryFilters>(noFilters);
  const [grouping, setGrouping] = useState<Grouping>('category');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const listRef = useRef<SectionList<LibraryExercise, LibrarySection>>(null);

  // A new search, filter or grouping shows the list from the top, or the
  // first matches would be hidden above the scroll position.
  const scrollToTop = () => listRef.current?.getScrollResponder()?.scrollTo({ y: 0, animated: false });
  const search = (text: string) => {
    setQuery(text);
    scrollToTop();
  };
  const applyFilters = (next: LibraryFilters) => {
    setFilters(next);
    scrollToTop();
  };
  const regroup = (next: Grouping) => {
    setGrouping(next);
    scrollToTop();
  };

  const sections = groupExercises(filterExercises(exercises, query, filters), grouping);
  const count = activeFilterCount(filters);

  return (
    <View style={styles.root}>
      <View style={styles.controls}>
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Search size={20} strokeWidth={1.75} color={colors.textTertiary} style={styles.searchIcon} />
            <TextField
              value={query}
              onChangeText={search}
              placeholder="Search exercises"
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
              style={styles.searchField}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={count > 0 ? `Filters, ${count} active` : 'Filters'}
            onPress={() => setFiltersOpen(true)}
            style={({ pressed }) => [
              styles.filterButton,
              { borderColor: count > 0 ? colors.accent : colors.border },
              pressed && styles.pressed,
            ]}>
            <SlidersHorizontal size={20} strokeWidth={1.75} color={count > 0 ? colors.accentText : colors.textSecondary} />
            {count > 0 ? (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <AppText variant="caption" color="onAccent">
                  {count}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        </View>
        <SegmentedControl
          options={[
            { value: 'category', label: 'Category' },
            { value: 'muscle', label: 'Muscle' },
            { value: 'alpha', label: 'A–Z' },
          ]}
          value={grouping}
          onChange={regroup}
        />
      </View>

      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(item, index) => `${item.id}:${index}`}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + space[4] }]}
        renderSectionHeader={({ section }) => (
          <AppText variant="label" color="textSecondary" style={styles.sectionHeader}>
            {section.title}
          </AppText>
        )}
        renderItem={({ item }) => (
          <ListItem
            title={item.name}
            subtitle={[schemeLabels[item.scheme], ...item.equipment.map((gear) => gear.name)].join(' · ')}
            dotColor={categoryColors[item.category]}
            onPress={() => onPress(item)}
            right={
              <View style={styles.right}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.favorite ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
                  hitSlop={space[2]}
                  onPress={() => toggleFavorite(item.id)}
                  style={({ pressed }) => [styles.star, pressed && styles.pressed]}>
                  <Star
                    size={20}
                    strokeWidth={1.75}
                    color={item.favorite ? colors.accent : colors.textTertiary}
                    fill={item.favorite ? colors.accent : 'transparent'}
                  />
                </Pressable>
                <ChevronRight size={20} strokeWidth={1.75} color={colors.textTertiary} />
              </View>
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No exercises match"
            action={
              count > 0 || query ? (
                <Button
                  title="Clear filters"
                  variant="secondary"
                  onPress={() => {
                    setFilters(noFilters);
                    setQuery('');
                  }}
                />
              ) : undefined
            }
          />
        }
      />

      <FilterSheet
        visible={filtersOpen}
        exercises={exercises}
        filters={filters}
        onChange={applyFilters}
        onClose={() => setFiltersOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  controls: { gap: space[3], paddingBottom: space[2] },
  searchRow: { flexDirection: 'row', gap: space[2] },
  search: { flex: 1, justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: space[3], zIndex: 1 },
  searchField: { paddingLeft: space[10] },
  filterButton: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: -space[1],
    right: -space[1],
    minWidth: space[5],
    height: space[5],
    paddingHorizontal: space[1],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  content: { flexGrow: 1 },
  sectionHeader: { paddingTop: space[5], paddingBottom: space[2] },
  right: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  star: { width: touch.min - space[2], height: touch.min, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
