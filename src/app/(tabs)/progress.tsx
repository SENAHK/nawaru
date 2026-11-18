import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, TrendingUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { ChoiceChip } from '@/components/choice-chip';
import { EmptyState } from '@/components/empty-state';
import { ListItem } from '@/components/list-item';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { Sheet } from '@/components/sheet';
import {
  getConsistencySessions,
  getExerciseHistory,
  getExerciseName,
  getHangOverview,
  getHangSeries,
  getLastLoggedExercise,
} from '@/db/queries/progress';
import { useDbQuery } from '@/db/use-db-version';
import { LibraryList } from '@/features/library/library-list';
import { ConsistencyChart } from '@/features/progress/consistency-chart';
import { LineChart } from '@/features/progress/line-chart';
import {
  formatCombo,
  percentOfBodyweight,
  summarize,
  weeklyConsistency,
} from '@/features/progress/stats';
import { today } from '@/lib/dates';
import { formatAddedLoad, formatShortDate } from '@/lib/format';
import { radius, space, touch, useTheme } from '@/theme';

type Unit = 'kg' | 'bw';

// S12 Progress (docs/screens.md): max hangs, exercise history, consistency.
export default function ProgressScreen() {
  const params = useLocalSearchParams<{ exerciseId?: string }>();
  const date = today();

  return (
    <Screen title="Progress">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <MaxHangs date={date} />
        <ExerciseHistory requestedId={params.exerciseId ?? null} />
        <Consistency date={date} />
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" color="textSecondary" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function MaxHangs({ date }: { date: string }) {
  const overview = useDbQuery(getHangOverview, 'hang-overview');
  const [comboKey, setComboKey] = useState<string | null>(null);
  const [unit, setUnit] = useState<Unit>('kg');
  // Default: the combination used the most.
  const combo = overview.combos.find((item) => item.key === comboKey) ?? overview.combos[0] ?? null;
  const series = useDbQuery(
    () => (combo ? getHangSeries(combo) : { points: [], references: [] }),
    `hang-series:${combo?.key ?? ''}`,
  );

  if (!combo || series.points.length === 0) {
    return (
      <Section title="Max hangs">
        <Card>
          <EmptyState
            icon={TrendingUp}
            title="No hangs logged yet"
            text="Log a max hang test to start tracking."
          />
        </Card>
      </Section>
    );
  }

  const bodyweight = overview.bodyweightKg;
  const asBodyweight = unit === 'bw' && bodyweight != null;
  const format = (kg: number) =>
    asBodyweight ? `${percentOfBodyweight(kg, bodyweight)}%` : formatAddedLoad(Math.round(kg * 10) / 10);
  const axisFormat = (kg: number) =>
    asBodyweight ? `${percentOfBodyweight(kg, bodyweight)}%` : `${kg > 0 ? '+' : kg < 0 ? '−' : ''}${Math.abs(Math.round(kg * 10) / 10)}`;
  const { best, change } = summarize(series.points, date);

  return (
    <Section title="Max hangs">
      {overview.combos.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {overview.combos.map((item) => (
            <ChoiceChip
              key={item.key}
              label={formatCombo(item)}
              selected={item.key === combo.key}
              onPress={() => setComboKey(item.key)}
            />
          ))}
        </ScrollView>
      ) : (
        <AppText color="textSecondary">{formatCombo(combo)}</AppText>
      )}

      {bodyweight != null ? (
        <SegmentedControl
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'bw', label: '% BW' },
          ]}
          value={unit}
          onChange={setUnit}
        />
      ) : null}

      <Card>
        <LineChart
          points={series.points}
          references={series.references}
          format={format}
          axisFormat={axisFormat}
        />
      </Card>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <AppText variant="bodySm" color="textSecondary">
            Best
          </AppText>
          <AppText variant="displayM">{best ? format(best.kg) : '–'}</AppText>
          {best ? (
            <AppText variant="bodySm" color="textSecondary">
              {formatShortDate(best.date)}
            </AppText>
          ) : null}
        </Card>
        <Card style={styles.stat}>
          <AppText variant="bodySm" color="textSecondary">
            Last 8 weeks
          </AppText>
          <AppText variant={change == null ? 'title2' : 'displayM'}>
            {change == null
              ? 'Not enough data'
              : asBodyweight
                ? `${change >= 0 ? '+' : '−'}${Math.abs(Math.round((change / bodyweight) * 100))}%`
                : `${change >= 0 ? '+' : '−'}${Math.abs(change)} kg`}
          </AppText>
        </Card>
      </View>
    </Section>
  );
}

function ExerciseHistory({ requestedId }: { requestedId: string | null }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState<{ id: string; requestedId: string | null } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const last = useDbQuery(getLastLoggedExercise, 'last-logged');
  // An exercise opened from its detail screen wins over an earlier pick.
  const exerciseId =
    picked && picked.requestedId === requestedId ? picked.id : (requestedId ?? picked?.id ?? last?.id ?? null);
  const name = useDbQuery(() => (exerciseId ? getExerciseName(exerciseId) : null), `name:${exerciseId}`);
  const entries = useDbQuery(() => (exerciseId ? getExerciseHistory(exerciseId) : []), `history:${exerciseId}`);

  return (
    <Section title="Exercise history">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name ? `Exercise: ${name}. Change` : 'Choose an exercise'}
        onPress={() => setPickerOpen(true)}
        style={({ pressed }) => [
          styles.picker,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && styles.pressed,
        ]}>
        <AppText variant="bodyStrong" color={name ? 'textPrimary' : 'textTertiary'} style={styles.pickerText}>
          {name ?? 'Choose an exercise'}
        </AppText>
        <ChevronRight size={20} strokeWidth={1.75} color={colors.textTertiary} />
      </Pressable>

      {exerciseId && entries.length === 0 ? (
        <AppText color="textSecondary">Not logged yet.</AppText>
      ) : null}
      {entries.map((entry) => (
        <ListItem
          key={entry.id}
          title={formatShortDate(entry.date)}
          subtitle={[
            entry.summary,
            `${entry.sets} ${entry.sets === 1 ? 'set' : 'sets'}${entry.fails > 0 ? ` · ${entry.fails} failed` : ''}`,
          ].join(' · ')}
          right={
            <View style={styles.entryRight}>
              {entry.pr ? <Badge variant="pr" label="PR" /> : null}
              {entry.bestKg != null ? (
                <AppText variant="bodyStrong">{formatAddedLoad(entry.bestKg)}</AppText>
              ) : null}
            </View>
          }
          onPress={() => router.push({ pathname: '/log/[exerciseLogId]', params: { exerciseLogId: entry.id } })}
        />
      ))}

      <Sheet visible={pickerOpen} title="Choose an exercise" onClose={() => setPickerOpen(false)} scroll={false}>
        <LibraryList
          bottomInset={insets.bottom}
          onPress={(exercise) => {
            setPicked({ id: exercise.id, requestedId });
            setPickerOpen(false);
          }}
        />
      </Sheet>
    </Section>
  );
}

function Consistency({ date }: { date: string }) {
  const sessions = useDbQuery(() => getConsistencySessions(date), `consistency:${date}`);
  if (sessions.length === 0) return null;
  return (
    <Section title="Consistency">
      <Card>
        <ConsistencyChart weeks={weeklyConsistency(sessions, date)} />
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  content: { gap: space[8], paddingTop: space[2], paddingBottom: space[16] },
  section: { gap: space[3] },
  chips: { gap: space[2] },
  stats: { flexDirection: 'row', gap: space[3] },
  stat: { flex: 1, gap: space[1] },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: touch.min,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  pickerText: { flex: 1 },
  pressed: { opacity: 0.6 },
  entryRight: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
