import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import type { SessionSummary } from '@/db/queries/schedule';
import { openSession } from '@/features/session/session-card';
import { ProgramDot, StatusBadge } from '@/features/session/session-parts';
import { addDays, today } from '@/lib/dates';
import { radius, space, touch, useTheme } from '@/theme';

const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });

/** Seven rows, Monday first; each lists that day's sessions (docs/screens.md S2). */
export function WeekView({ monday, sessions }: { monday: string; sessions: SessionSummary[] }) {
  const { colors } = useTheme();
  const now = today();

  return (
    <View style={styles.root}>
      {Array.from({ length: 7 }, (_, index) => {
        const date = addDays(monday, index);
        const day = sessions.filter((session) => session.scheduledDate === date);
        const isToday = date === now;
        return (
          <View
            key={date}
            style={[
              styles.day,
              { borderColor: colors.border },
              isToday && { backgroundColor: colors.accentSubtle, borderColor: 'transparent' },
            ]}>
            <View style={styles.dayLabel}>
              <AppText variant="label" color={isToday ? 'accentText' : 'textSecondary'}>
                {dayFormat.format(new Date(`${date}T00:00:00`))}
              </AppText>
              <AppText variant="title2" color={isToday ? 'accentText' : 'textPrimary'}>
                {Number(date.slice(8))}
              </AppText>
            </View>
            <View style={styles.sessions}>
              {day.length === 0 ? (
                <AppText color="textTertiary" style={styles.empty}>
                  –
                </AppText>
              ) : (
                day.map((session) => <SessionLine key={session.scheduledSessionId ?? session.workoutId} session={session} />)
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function SessionLine({ session, onPress }: { session: SessionSummary; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress ?? (() => openSession(session))}
      style={({ pressed }) => [styles.line, pressed && styles.pressed]}>
      <ProgramDot color={session.program?.color ?? null} />
      <AppText variant="bodyStrong" numberOfLines={1} style={styles.title}>
        {session.title}
      </AppText>
      <StatusBadge status={session.status} date={session.scheduledDate} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[2] },
  day: {
    flexDirection: 'row',
    gap: space[3],
    padding: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  dayLabel: { width: space[10], alignItems: 'center' },
  sessions: { flex: 1, justifyContent: 'center' },
  empty: { paddingVertical: space[2] },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: touch.min },
  title: { flex: 1 },
  pressed: { opacity: 0.6 },
});
