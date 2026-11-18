import { NativeTabs } from 'expo-router/native-tabs';
import { router } from 'expo-router';
import { StyleSheet, View, Pressable } from 'react-native';

import { AppText } from '@/components/app-text';
import type { ActiveWorkout } from '@/db/queries/schedule';
import { currentStep, remainingMs } from '@/features/timer/machine';
import type { Session } from '@/features/timer/store';
import { phaseLabel, useNow } from '@/features/timer/timer-panel';
import { formatCountdown } from '@/lib/format';
import { space, timerPhases, useTheme } from '@/theme';

type SessionBarProps = {
  session: Session | null;
  workout: ActiveWorkout | null;
};

/**
 * Content of the bar above the tab bar (docs/screens.md §1.3): the running
 * timer, or the workout in progress. Rendered twice by iOS (regular and
 * inline placements), so it keeps no state of its own.
 */
export function SessionBarContent({ session, workout }: SessionBarProps) {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const { colors } = useTheme();
  const timer = session?.timer ?? null;
  const running = timer?.status === 'running';
  const now = useNow(running || (!timer && workout != null));

  if (session && timer) {
    const step = currentStep(timer);
    const finished = timer.status === 'done' || timer.status === 'stopped';
    const phase = finished ? 'done' : (step?.phase ?? 'done');
    const remaining = remainingMs(timer, now);
    const status = finished
      ? 'Tap to save'
      : timer.status === 'paused'
        ? 'PAUSED'
        : remaining == null
          ? phaseLabel(step, session.usesHangboard)
          : `${phaseLabel(step, session.usesHangboard)} ${formatCountdown(remaining)}`;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${session.exerciseName}, ${status}. Open timer`}
        onPress={() =>
          router.push({ pathname: '/log/[exerciseLogId]', params: { exerciseLogId: session.exerciseLogId } })
        }
        style={styles.root}>
        <View style={[styles.dot, { backgroundColor: timerPhases[phase].bg }]} />
        {placement === 'inline' ? null : (
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.title}>
            {session.exerciseName}
          </AppText>
        )}
        <AppText
          variant="bodyStrong"
          color={finished ? 'accentText' : 'textPrimary'}
          numberOfLines={1}
          style={[styles.status, placement === 'inline' && styles.title]}>
          {status}
        </AppText>
      </Pressable>
    );
  }

  if (!workout) return null;
  const open = () =>
    workout.scheduledSessionId
      ? router.push({
          pathname: '/session/[scheduledSessionId]',
          params: { scheduledSessionId: workout.scheduledSessionId },
        })
      : router.push({ pathname: '/workout/[workoutId]', params: { workoutId: workout.workoutId } });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${workout.title} in progress. Resume`}
      onPress={open}
      style={styles.root}>
      <View style={[styles.dot, { backgroundColor: colors.accent }]} />
      <AppText variant="bodyStrong" numberOfLines={1} style={styles.title}>
        {workout.title}
      </AppText>
      <AppText variant="bodyStrong" color="textSecondary" style={styles.status}>
        {formatCountdown(now - workout.startedAt)}
      </AppText>
      {placement === 'inline' ? null : (
        <AppText variant="bodyStrong" color="accentText">
          Resume
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
  },
  dot: { width: space[3], height: space[3], borderRadius: space[2] },
  title: { flex: 1 },
  status: { fontVariant: ['tabular-nums'] },
});
