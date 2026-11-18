import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  activeFilterCount,
  filterExercises,
  groupExercises,
  noFilters,
  type LibraryExercise,
} from '../../src/features/library/filter';

const exercise = (overrides: Partial<LibraryExercise> & Pick<LibraryExercise, 'id' | 'name'>): LibraryExercise => ({
  category: 'strength',
  scheme: 'reps',
  muscles: [],
  equipment: [],
  favorite: false,
  ...overrides,
});

const library = [
  exercise({
    id: 'hang',
    name: 'Max hangs',
    category: 'fingers',
    scheme: 'isometric',
    muscles: [{ id: 'flex', name: 'Forearm flexors', role: 'primary' }],
    equipment: [{ id: 'board', name: 'Hangboard' }],
    favorite: true,
  }),
  exercise({
    id: 'pull',
    name: 'Pull-ups',
    muscles: [
      { id: 'lats', name: 'Lats', role: 'primary' },
      { id: 'biceps', name: 'Biceps', role: 'primary' },
      { id: 'flex', name: 'Forearm flexors', role: 'secondary' },
    ],
    equipment: [{ id: 'bar', name: 'Pull-up bar' }],
  }),
  exercise({ id: 'plank', name: 'Élévations', category: 'conditioning' }),
];

const names = (items: LibraryExercise[]) => items.map((item) => item.name);

describe('library filters', () => {
  it('searches names ignoring case and accents', () => {
    assert.deepEqual(names(filterExercises(library, 'elev', noFilters)), ['Élévations']);
    assert.deepEqual(names(filterExercises(library, ' PULL', noFilters)), ['Pull-ups']);
  });

  it('combines groups with AND and values inside a group with OR', () => {
    const muscles = { ...noFilters, muscles: ['flex', 'lats'] };
    assert.deepEqual(names(filterExercises(library, '', muscles)), ['Max hangs', 'Pull-ups']);
    assert.deepEqual(names(filterExercises(library, '', { ...muscles, categories: ['fingers'] })), ['Max hangs']);
    assert.deepEqual(names(filterExercises(library, '', { ...noFilters, favoritesOnly: true })), ['Max hangs']);
    assert.equal(activeFilterCount({ ...muscles, favoritesOnly: true }), 3);
  });

  it('groups by category, by primary muscle and alphabetically', () => {
    assert.deepEqual(
      groupExercises(library, 'category').map((section) => [section.title, names(section.data)]),
      [
        ['Fingers', ['Max hangs']],
        ['Strength', ['Pull-ups']],
        ['Conditioning', ['Élévations']],
      ],
    );
    assert.deepEqual(
      groupExercises(library, 'muscle').map((section) => [section.title, names(section.data)]),
      [
        ['Biceps', ['Pull-ups']],
        ['Forearm flexors', ['Max hangs']],
        ['Lats', ['Pull-ups']],
        ['Other', ['Élévations']],
      ],
    );
    assert.deepEqual(
      groupExercises(library, 'alpha').map((section) => section.title),
      ['E', 'M', 'P'],
    );
  });
});
