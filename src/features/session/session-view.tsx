import { router, Stack } from 'expo-router';
import { Check, CircleAlert } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import {
  ensureWorkout,
  findExerciseLog,
  finishWorkout,
  startWorkout,
  type SessionItem,
  type SessionSummary,
} from '@/db/queries/schedule';
import { today } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { space, useTheme } from '@/theme';

import { ExerciseLine, SessionOrigin, StatusBadge } from './session-parts';

const confirm = (title: string, action: string, onConfirm: () => void) =>
  Alert.alert(title, undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, onPress: onConfirm },
  ]);

// S3 Session: same screen for a planned session and a free workout
// (docs/screens.md). Editing the date, adding an exercise and deleting the
// log come later.
export function SessionView({ session }: { session: SessionSummary | null }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!session) return <EmptyState title="Session not found" />;

  const { status } = session;
  const future = session.scheduledDate > today();
  const notLogged = session.items.filter((item) => item.state === 'todo').length;

  /** The workout is created on first use, with one log per prescription. */
  const workoutId = (start: boolean): string | null =>
    session.scheduledSessionId ? ensureWorkout(session.scheduledSessionId, start) : session.workoutId;

  const openExercise = (item: SessionItem, withTimer: boolean) => {
    const run = () => {
      const id = workoutId(false);
      if (!id) return;
      // Before the workout exists, items are prescriptions: find the log just created for this one.
      const exerciseLogId = item.exerciseLogId ?? findExerciseLog(id, item.key);
      if (!exerciseLogId) return;
      router.push({
        pathname: '/log/[exerciseLogId]',
        params: { exerciseLogId, ...(withTimer ? { autostart: '1' } : {}) },
      });
    };
    if (future && !session.workoutId) confirm('Log this session early?', 'Log', run);
    else run();
  };

  const start = () => {
    const begin = () => {
      const id = workoutId(true);
      if (id) startWorkout(id);
    };
    if (future) confirm('Log this session early?', 'Start', begin);
    else begin();
  };

  const finish = () => {
    const end = () => {
      const id = workoutId(false);
      if (id) finishWorkout(id);
      router.back();
    };
    if (notLogged > 0) {
      confirm(
        `${notLogged} ${notLogged === 1 ? 'exercise' : 'exercises'} not logged. Finish anyway?`,
        'Finish',
        end,
      );
    } else end();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: session.title }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <View style={styles.row}>
            <SessionOrigin session={session} />
            <StatusBadge status={status} date={session.scheduledDate} />
          </View>
          <View style={styles.row}>
            <AppText variant="title1" accessibilityRole="header">
              {session.title}
            </AppText>
            {session.isTest ? <Badge variant="test" label="Test" /> : null}
          </View>
          <AppText variant="bodySm" color="textSecondary">
            {session.program
              ? `Planned ${formatDate(session.scheduledDate)} · by ${session.program.author}`
              : formatDate(session.scheduledDate)}
            {session.performedOn && session.performedOn !== session.scheduledDate
              ? ` · Performed on ${formatDate(session.performedOn)}`
              : ''}
          </AppText>
        </View>

        {session.items.map((item) => (
          <Card key={item.key}>
            <ExerciseLine item={item} />
            {item.isTest ? <Badge variant="test" label="Test" /> : null}
            {item.note ? (
              <AppText variant="bodySm" color="textSecondary" style={styles.note}>
                {item.note}
              </AppText>
            ) : null}
            <View style={styles.row}>
              <View style={styles.state}>
                {item.state === 'done' ? (
                  <Check size={20} strokeWidth={1.75} color={colors.success} />
                ) : item.state === 'partial' ? (
                  <CircleAlert size={20} strokeWidth={1.75} color={colors.danger} />
                ) : null}
                <AppText
                  variant="bodySm"
                  color={item.state === 'done' ? 'success' : item.state === 'partial' ? 'danger' : 'textTertiary'}>
                  {item.state === 'done' ? 'Done' : item.state === 'partial' ? 'Partial' : 'To do'}
                </AppText>
              </View>
              {item.state === 'todo' ? (
                <>
                  <Button title="Log" variant="ghost" onPress={() => openExercise(item, false)} />
                  <Button title="Start" variant="secondary" onPress={() => openExercise(item, true)} />
                </>
              ) : (
                <Button title="Edit" variant="ghost" onPress={() => openExercise(item, false)} />
              )}
            </View>
          </Card>
        ))}

        {session.items.length === 0 ? (
          <AppText color="textSecondary">No exercises in this session.</AppText>
        ) : null}
      </ScrollView>

      {status === 'done' ? null : (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space[3], borderTopColor: colors.border }]}>
          {status === 'in_progress' ? (
            <Button title="Finish session" size="lg" onPress={finish} />
          ) : (
            <Button title="Start session" size="lg" onPress={start} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: space[4], gap: space[3] },
  heading: { gap: space[2], paddingBottom: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  state: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[1] },
  note: { fontStyle: 'italic' },
  footer: {
    paddingTop: space[3],
    paddingHorizontal: space[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
