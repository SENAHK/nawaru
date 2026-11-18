import { DatePicker, Host } from '@expo/ui/swift-ui';
import { router, Stack } from 'expo-router';
import { Check, CircleAlert, Trash2 } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { showToast } from '@/components/toast';
import {
  deleteWorkout,
  ensureWorkout,
  findExerciseLog,
  finishWorkout,
  setPerformedOn,
  startWorkout,
  type SessionItem,
  type SessionSummary,
} from '@/db/queries/schedule';
import { closeSession, getSession } from '@/features/timer/store';
import { parseCalendarDate, toCalendarDate, today } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { radius, space, useTheme } from '@/theme';

import { ExerciseLine, SessionOrigin, StatusBadge } from './session-parts';

const confirm = (title: string, action: string, onConfirm: () => void) =>
  Alert.alert(title, undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, onPress: onConfirm },
  ]);

// S3 Session: same screen for a planned session and a free workout
// (docs/screens.md).
export function SessionView({ session }: { session: SessionSummary | null }) {
  const { colors, scheme } = useTheme();
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
      showToast('Session saved');
    };
    if (notLogged > 0) {
      confirm(
        `${notLogged} ${notLogged === 1 ? 'exercise' : 'exercises'} not logged. Finish anyway?`,
        'Finish',
        end,
      );
    } else end();
  };

  const addExercise = () => {
    const open = () =>
      router.push({
        pathname: '/add-exercise',
        params: session.workoutId
          ? { workoutId: session.workoutId }
          : { scheduledSessionId: session.scheduledSessionId ?? undefined },
      });
    if (future && !session.workoutId) confirm('Log this session early?', 'Log', open);
    else open();
  };

  const remove = () => {
    const { workoutId: id } = session;
    if (!id) return;
    Alert.alert(
      'Delete log?',
      'The exercises and sets logged in this session will be deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete log',
          style: 'destructive',
          onPress: () => {
            // A timer left running on one of these exercises goes too.
            const running = getSession();
            if (running && session.items.some((item) => item.exerciseLogId === running.exerciseLogId)) {
              closeSession();
            }
            deleteWorkout(id);
            // A free session no longer exists; a planned one goes back to planned or missed.
            if (!session.scheduledSessionId) router.back();
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Stack.Screen
        options={{
          title: session.title,
          headerRight: session.workoutId
            ? () => <IconButton icon={Trash2} label="Delete log" onPress={remove} />
            : undefined,
        }}
      />
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
          </AppText>
        </View>

        {session.workoutId && session.performedOn ? (
          <View style={[styles.performed, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText color="textSecondary" style={styles.performedLabel}>
              Performed on
            </AppText>
            <Host matchContents colorScheme={scheme}>
              <DatePicker
                selection={parseCalendarDate(session.performedOn)}
                range={{ end: new Date() }}
                displayedComponents={['date']}
                onDateChange={(date) => {
                  if (session.workoutId) setPerformedOn(session.workoutId, toCalendarDate(date));
                }}
              />
            </Host>
          </View>
        ) : null}

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

        <Button title="Add exercise" variant="secondary" onPress={addExercise} />
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
  performed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  performedLabel: { flex: 1 },
  footer: {
    paddingTop: space[3],
    paddingHorizontal: space[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
