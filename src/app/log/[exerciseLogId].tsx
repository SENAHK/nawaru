import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { setCount } from '@/features/timer/build-steps';
import { currentRowKey, type LogRow } from '@/features/timer/rows';
import { SetRow } from '@/features/timer/set-row';
import {
  addSet,
  closeSession,
  editRow,
  openSession,
  saveSession,
  skipLastSet,
  startTimer,
  useSession,
} from '@/features/timer/store';
import { TimerPanel } from '@/features/timer/timer-panel';
import type { TimerDosage } from '@/features/timer/types';
import { formatDuration } from '@/lib/format';
import { space, useTheme } from '@/theme';

/** "7s:3s × 5 × 6", smallest unit first (docs/design-system.md §10). */
function dosageSummary(dosage: TimerDosage): string {
  switch (dosage.scheme) {
    case 'reps':
      return `${dosage.reps} reps × ${dosage.sets} sets`;
    case 'isometric':
      return `${formatDuration(dosage.durationS ?? 0)} × ${dosage.sets}`;
    case 'intervals':
      return `${dosage.onS}s:${dosage.offS}s × ${dosage.reps} × ${dosage.sets}`;
    case 'circuit':
      return `${dosage.itemsPerRound} climbs × ${dosage.rounds} rounds`;
    case 'slots':
      return `${formatDuration(dosage.slotDurationS ?? 0)} × ${dosage.sets}`;
    case 'free_duration':
      return formatDuration(dosage.totalDurationS ?? 0);
  }
}

// S4 Exercise (timer + log) and S5 Log: same screen, with or without a timer
// (docs/screens.md). Grip, effort and notes come with the full log step.
export default function ExerciseLogScreen() {
  useKeepAwake();
  const { exerciseLogId, autostart } = useLocalSearchParams<{
    exerciseLogId: string;
    autostart?: string;
  }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [focus, setFocus] = useState(false);
  const stored = useSession();
  const session = stored?.exerciseLogId === exerciseLogId ? stored : null;

  useEffect(() => {
    const opened = openSession(exerciseLogId);
    if (opened && autostart === '1' && !opened.timer) startTimer();
  }, [exerciseLogId, autostart]);

  if (!session) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <EmptyState title="Loading…" />
      </View>
    );
  }

  const { timer, rows, dosage } = session;
  const timerActive = timer?.status === 'running' || timer?.status === 'paused';
  const currentKey = timerActive ? currentRowKey(rows) : null;
  const canChangeSets = dosage.scheme !== 'free_duration';

  const save = () => {
    saveSession();
    router.back();
  };

  const confirmStop = () =>
    Alert.alert('Stop timer?', undefined, [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Stop and save', style: 'destructive', onPress: save },
    ]);

  const discard = () =>
    Alert.alert('Discard changes?', undefined, [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          closeSession();
          router.back();
        },
      },
    ]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {timer ? (
        <TimerPanel
          session={session}
          timer={timer}
          focus={focus}
          onToggleFocus={() => setFocus((value) => !value)}
          // Closing leaves the timer running; it can be reopened from Today.
          onClose={() => router.back()}
        />
      ) : (
        <View style={[styles.plainHeader, { paddingTop: insets.top }]}>
          <IconButton icon={X} label="Close" onPress={discard} />
        </View>
      )}

      {focus && timer ? null : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.heading}>
              <AppText variant="title2" accessibilityRole="header">
                {session.exerciseName}
              </AppText>
              <AppText variant="bodySm" color="textSecondary">
                {dosageSummary(dosage)}
              </AppText>
            </View>

            {groupBySet(rows).map(([setIndex, setRows]) => (
              <View key={setIndex} style={styles.set}>
                {dosage.scheme === 'circuit' ? (
                  <AppText variant="label" color="textSecondary">
                    Round {setIndex}
                  </AppText>
                ) : null}
                {setRows.map((row) => (
                  <SetRow
                    key={row.key}
                    row={row}
                    scheme={dosage.scheme}
                    targetReps={dosage.reps ?? null}
                    current={row.key === currentKey}
                    onChange={(values) => editRow(row.key, values)}
                  />
                ))}
              </View>
            ))}

            {canChangeSets ? (
              <View style={styles.setActions}>
                <Button
                  title="Skip set"
                  variant="ghost"
                  disabled={setCount(dosage) <= 1}
                  onPress={() => skipLastSet()}
                  style={styles.setAction}
                />
                <Button title="Add set" variant="ghost" onPress={addSet} style={styles.setAction} />
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + space[3], borderTopColor: colors.border }]}>
            {timer ? null : (
              <Button title="Start timer" variant="secondary" size="lg" onPress={startTimer} style={styles.footerButton} />
            )}
            <Button
              title={timerActive ? 'Stop and save' : 'Save'}
              size="lg"
              onPress={timerActive ? confirmStop : save}
              style={styles.footerButton}
            />
          </View>
        </>
      )}
    </View>
  );
}

function groupBySet(rows: LogRow[]): [number, LogRow[]][] {
  const groups = new Map<number, LogRow[]>();
  for (const row of rows) {
    groups.set(row.setIndex, [...(groups.get(row.setIndex) ?? []), row]);
  }
  return [...groups.entries()];
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  plainHeader: { alignItems: 'flex-start', paddingHorizontal: space[2] },
  content: { padding: space[4], gap: space[3] },
  heading: { gap: space[1], paddingBottom: space[2] },
  set: { gap: space[2] },
  setActions: { flexDirection: 'row', gap: space[3] },
  setAction: { flex: 1 },
  footer: {
    flexDirection: 'row',
    gap: space[3],
    paddingTop: space[3],
    paddingHorizontal: space[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: { flex: 1 },
});
