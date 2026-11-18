import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Clapperboard, Star } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ListItem } from '@/components/list-item';
import {
  exerciseByIdQuery,
  exerciseEquipmentQuery,
  exerciseHistoryQuery,
  exerciseMeasuresQuery,
  exerciseMusclesQuery,
  exerciseReferencesQuery,
} from '@/db/queries/exercise';
import { isFavorite, toggleFavorite } from '@/db/queries/library';
import { useDbQuery } from '@/db/use-db-version';
import { formatAddedLoad, formatDate, formatGrip } from '@/lib/format';
import {
  categoryLabels,
  effortScaleLabels,
  measureLabels,
  schemeDescriptions,
  schemeLabels,
} from '@/lib/labels';
import { categoryColors, radius, space, useTheme } from '@/theme';

const HISTORY_LIMIT = 5;

export default function ExerciseDetailScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { colors } = useTheme();

  const { data: exercises, updatedAt } = useLiveQuery(exerciseByIdQuery(exerciseId), [
    exerciseId,
  ]);
  const { data: muscles } = useLiveQuery(exerciseMusclesQuery(exerciseId), [exerciseId]);
  const { data: equipment } = useLiveQuery(exerciseEquipmentQuery(exerciseId), [exerciseId]);
  const { data: measures } = useLiveQuery(exerciseMeasuresQuery(exerciseId), [exerciseId]);
  const { data: history } = useLiveQuery(exerciseHistoryQuery(exerciseId, HISTORY_LIMIT), [
    exerciseId,
  ]);
  const { data: references } = useLiveQuery(exerciseReferencesQuery(exerciseId), [exerciseId]);

  const favorite = useDbQuery(() => isFavorite(exerciseId), `favorite:${exerciseId}`);

  const exercise = exercises[0];
  // `updatedAt` is unset until the first query result arrives.
  if (!updatedAt) return null;
  if (!exercise) {
    return <EmptyState title="Exercise not found" />;
  }

  const primaryMuscles = muscles.filter((muscle) => muscle.role === 'primary');
  const secondaryMuscles = muscles.filter((muscle) => muscle.role === 'secondary');
  // One step per sentence of the instructions.
  const steps = exercise.instructions.split(/(?<=\.)\s+/).filter(Boolean);
  const categoryColor = categoryColors[exercise.category];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: exercise.name,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
              hitSlop={space[2]}
              onPress={() => toggleFavorite(exercise.id)}
              style={({ pressed }) => [styles.star, pressed && styles.pressed]}>
              <Star
                size={22}
                strokeWidth={1.75}
                color={favorite ? colors.accent : colors.textSecondary}
                fill={favorite ? colors.accent : 'transparent'}
              />
            </Pressable>
          ),
        }}
      />

      {/* Media placeholder: videos and diagrams are not defined yet. */}
      <View style={[styles.media, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Clapperboard size={space[8]} strokeWidth={1.75} color={colors.textTertiary} />
        <AppText variant="caption" color="textTertiary">
          Video coming later
        </AppText>
      </View>

      <View style={styles.heading}>
        <AppText variant="title1" accessibilityRole="header">
          {exercise.name}
        </AppText>
        <View style={styles.metaRow}>
          <View style={[styles.dot, { backgroundColor: categoryColor }]} />
          <AppText variant="bodySm" color="textSecondary">
            {categoryLabels[exercise.category]} · {schemeLabels[exercise.dosageScheme]}
          </AppText>
          {exercise.isTestable ? <Badge variant="test" label="Test" /> : null}
        </View>
        <AppText color="textSecondary">{exercise.description}</AppText>
      </View>

      <Button
        title="Add to today"
        size="lg"
        onPress={() => router.push({ pathname: '/add-exercise', params: { exerciseId: exercise.id } })}
      />

      <Section title="How to do it">
        {steps.map((step, index) => (
          <View key={step} style={styles.step}>
            <AppText variant="bodyStrong" color="accentText" style={styles.stepNumber}>
              {index + 1}
            </AppText>
            <AppText style={styles.stepText}>{step}</AppText>
          </View>
        ))}
      </Section>

      <Section title="Dosage">
        <Fact label="Structure" value={schemeLabels[exercise.dosageScheme]} />
        <AppText variant="bodySm" color="textSecondary">
          {schemeDescriptions[exercise.dosageScheme]}
        </AppText>
        <Fact label="Effort scale" value={effortScaleLabels[exercise.defaultEffortScale]} />
        <Fact label="One side at a time" value={exercise.unilateralAllowed ? 'Possible' : 'No'} />
        {exercise.isTestable ? (
          <AppText variant="bodySm" color="textSecondary">
            Logged as a test, your best successful set becomes a reference for loads given in %.
          </AppText>
        ) : null}
      </Section>

      <Section title="What you log">
        <ChipRow labels={measures.map(({ measure }) => measureLabels[measure])} />
      </Section>

      <Section title="Primary muscles">
        <ChipRow labels={primaryMuscles.map((muscle) => muscle.name)} emphasis />
      </Section>

      {secondaryMuscles.length > 0 ? (
        <Section title="Secondary muscles">
          <ChipRow labels={secondaryMuscles.map((muscle) => muscle.name)} />
        </Section>
      ) : null}

      <Section title="Equipment">
        {equipment.length > 0 ? (
          <ChipRow labels={equipment.map((item) => item.name)} />
        ) : (
          <AppText color="textSecondary">No equipment needed</AppText>
        )}
      </Section>

      <Section title="History">
        {history.length > 0 ? (
          history.map((log) => (
            <ListItem
              key={log.id}
              title={formatDate(log.performedOn)}
              subtitle={`${log.setCount} ${log.setCount === 1 ? 'set' : 'sets'}`}
              right={
                log.maxLoadKg != null ? (
                  <AppText variant="bodyStrong">{formatAddedLoad(log.maxLoadKg)}</AppText>
                ) : null
              }
            />
          ))
        ) : (
          <AppText color="textSecondary">No logs yet</AppText>
        )}
      </Section>

      {exercise.isTestable ? (
        <Section title="References">
          {references.length > 0 ? (
            references.map((reference) => (
              <ListItem
                key={reference.id}
                title={formatAddedLoad(reference.valueKg)}
                subtitle={[
                  reference.edgeMm != null ? `${reference.edgeMm} mm` : null,
                  formatGrip(reference),
                  reference.durationS != null ? `${reference.durationS}s` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                right={
                  <AppText variant="bodySm" color="textSecondary">
                    {formatDate(reference.measuredOn)}
                  </AppText>
                }
              />
            ))
          ) : (
            <AppText color="textSecondary">No test yet</AppText>
          )}
        </Section>
      ) : null}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" color="textSecondary" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <AppText color="textSecondary">{label}</AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

function ChipRow({ labels, emphasis }: { labels: string[]; emphasis?: boolean }) {
  return (
    <View style={styles.chips}>
      {labels.map((label) => (
        <Chip key={label} label={label} emphasis={emphasis} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  star: { padding: space[1] },
  pressed: { opacity: 0.6 },
  content: { padding: space[4], paddingBottom: space[12], gap: space[6] },
  media: {
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  heading: { gap: space[2] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dot: { width: space[2], height: space[2], borderRadius: radius.full },
  section: { gap: space[3] },
  step: { flexDirection: 'row', gap: space[3] },
  stepNumber: { width: space[4] },
  stepText: { flex: 1 },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: space[4] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
