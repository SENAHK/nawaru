import { asc } from 'drizzle-orm';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Search } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ListItem } from '@/components/list-item';
import { Stepper } from '@/components/stepper';
import { TextField } from '@/components/text-field';
import { db, schema } from '@/db/client';
import type { DosageScheme } from '@/db/enums';
import {
  addFreeExercise,
  getAddExerciseDraft,
  type AddExerciseDraft,
  type AddTarget,
  type DosageValues,
} from '@/db/queries/log';
import { useDbQuery } from '@/db/use-db-version';
import { formatAddedLoad, formatDuration } from '@/lib/format';
import { categoryLabels, schemeLabels } from '@/lib/labels';
import { categoryColors, space, useTheme } from '@/theme';

type Field = {
  key: keyof DosageValues;
  label: string;
  min: number;
  max: number;
  step?: number;
  duration?: boolean;
};

const sets: Field = { key: 'sets', label: 'Sets', min: 1, max: 30 };
const rest: Field = { key: 'restBetweenSetsS', label: 'Rest', min: 0, max: 1800, step: 15, duration: true };

/** Quick dosage form per scheme (S10 without test and progression options). */
const fields: Record<DosageScheme, Field[]> = {
  reps: [sets, { key: 'reps', label: 'Reps', min: 1, max: 100 }, rest],
  isometric: [sets, { key: 'durationS', label: 'Hold', min: 1, max: 3600, duration: true }, rest],
  intervals: [
    sets,
    { key: 'reps', label: 'Reps', min: 1, max: 100 },
    { key: 'onS', label: 'On', min: 1, max: 600, duration: true },
    { key: 'offS', label: 'Off', min: 1, max: 600, duration: true },
    rest,
  ],
  circuit: [
    { key: 'rounds', label: 'Rounds', min: 1, max: 20 },
    { key: 'itemsPerRound', label: 'Climbs', min: 1, max: 10 },
    rest,
  ],
  slots: [
    { key: 'sets', label: 'Slots', min: 1, max: 60 },
    { key: 'slotDurationS', label: 'Slot', min: 15, max: 1800, step: 15, duration: true },
  ],
  free_duration: [{ key: 'totalDurationS', label: 'Duration', min: 300, max: 6 * 3600, step: 300, duration: true }],
};

const LOAD_SCHEMES = new Set<DosageScheme>(['reps', 'isometric', 'intervals']);

/** Case- and accent-insensitive search key. */
const searchKey = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// S6 Add exercise: pick from the library, set a quick dosage, then start the
// timer. Adds to the given workout or session, else to today's free session.
export default function AddExerciseScreen() {
  const params = useLocalSearchParams<{
    exerciseId?: string;
    workoutId?: string;
    scheduledSessionId?: string;
  }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<AddExerciseDraft | null>(() =>
    params.exerciseId ? getAddExerciseDraft(params.exerciseId) : null,
  );
  const exercises = useDbQuery(
    () => db.select().from(schema.exercise).orderBy(asc(schema.exercise.name)).all(),
    'exercises',
  );

  const target: AddTarget = params.workoutId
    ? { workoutId: params.workoutId }
    : params.scheduledSessionId
      ? { scheduledSessionId: params.scheduledSessionId }
      : null;

  if (!draft) {
    const key = searchKey(query);
    const matches = key ? exercises.filter((item) => searchKey(item.name).includes(key)) : exercises;
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <SheetHeader title="Add exercise" action="Cancel" onAction={() => router.back()} />
        <View style={styles.search}>
          <Search size={20} strokeWidth={1.75} color={colors.textTertiary} style={styles.searchIcon} />
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
            style={styles.searchField}
          />
        </View>
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space[4] }]}
          ListEmptyComponent={<EmptyState title="No exercises match" />}
          renderItem={({ item }) => (
            <ListItem
              title={item.name}
              subtitle={`${categoryLabels[item.category]} · ${schemeLabels[item.dosageScheme]}`}
              dotColor={categoryColors[item.category]}
              right={<ChevronRight size={20} strokeWidth={1.75} color={colors.textTertiary} />}
              onPress={() => setDraft(getAddExerciseDraft(item.id))}
            />
          )}
        />
      </View>
    );
  }

  const setValue = (key: keyof DosageValues, value: number) =>
    setDraft({ ...draft, dosage: { ...draft.dosage, [key]: value } });
  const showLoad = draft.measures.includes('load') && LOAD_SCHEMES.has(draft.scheme);

  const add = () => {
    const exerciseLogId = addFreeExercise(target, {
      exerciseId: draft.exerciseId,
      dosage: draft.dosage,
      targetLoadKg: showLoad ? draft.targetLoadKg : null,
    });
    router.replace({ pathname: '/log/[exerciseLogId]', params: { exerciseLogId, autostart: '1' } });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SheetHeader
        title={draft.name}
        // Opened from an exercise detail, there is no list to go back to.
        action={params.exerciseId ? 'Cancel' : 'Back'}
        onAction={() => (params.exerciseId ? router.back() : setDraft(null))}
      />
      <ScrollView contentContainerStyle={styles.form}>
        <AppText variant="bodySm" color="textSecondary">
          {schemeLabels[draft.scheme]} ·{' '}
          {draft.source === 'last' ? 'Pre-filled from your last time' : 'Default values'}
        </AppText>

        {fields[draft.scheme].map((field) => (
          <View key={field.key} style={styles.line}>
            <AppText color="textSecondary" style={styles.name}>
              {field.label}
            </AppText>
            <View style={styles.stepper}>
              <Stepper
                label={field.label.toLowerCase()}
                value={draft.dosage[field.key] ?? null}
                min={field.min}
                max={field.max}
                step={field.step}
                initial={field.min}
                format={field.duration ? formatDuration : String}
                inputHint={field.duration ? 'Seconds, or m:ss' : undefined}
                onChange={(value) => setValue(field.key, value)}
              />
            </View>
          </View>
        ))}

        {showLoad ? (
          <View style={styles.line}>
            <AppText color="textSecondary" style={styles.name}>
              Load
            </AppText>
            <View style={styles.stepper}>
              <Stepper
                label="load"
                value={draft.targetLoadKg}
                min={-100}
                max={200}
                format={formatAddedLoad}
                inputHint="Added load in kg (negative = assisted)"
                onChange={(targetLoadKg) => setDraft({ ...draft, targetLoadKg })}
              />
            </View>
          </View>
        ) : null}

      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space[3], borderTopColor: colors.border }]}>
        <Button title="Add and start" size="lg" onPress={add} />
      </View>
    </View>
  );
}

function SheetHeader({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <Button title={action} variant="ghost" onPress={onAction} style={styles.headerSide} />
      <AppText variant="title3" accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>
        {title}
      </AppText>
      <View style={styles.headerSide} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: space[2],
    paddingBottom: space[1],
    paddingHorizontal: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { width: space[16] + space[8], alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center' },
  search: { justifyContent: 'center', paddingHorizontal: space[4], paddingTop: space[3] },
  searchIcon: { position: 'absolute', left: space[4] + space[3], top: space[3] + 14, zIndex: 1 },
  searchField: { paddingLeft: space[10] },
  list: { paddingHorizontal: space[4], paddingTop: space[2] },
  form: { padding: space[4], gap: space[3] },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  name: { width: space[16] + space[4] },
  stepper: { flex: 1, flexDirection: 'row' },
  footer: {
    paddingTop: space[3],
    paddingHorizontal: space[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
