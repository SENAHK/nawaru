import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import type { SessionSummary } from '@/db/queries/schedule';
import { addDays, diffDays, today } from '@/lib/dates';
import { radius, space, useTheme } from '@/theme';

const MAX_DOTS = 3;
const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type MonthViewProps = {
  /** Monday of the first row and Sunday of the last. */
  from: string;
  to: string;
  month: string;
  sessions: SessionSummary[];
  onPressDay: (date: string) => void;
};

/**
 * Seven-column grid. Dots: filled = done or in progress, outline = planned,
 * grey = missed; "+2" beyond three (docs/screens.md S2).
 */
export function MonthView({ from, to, month, sessions, onPressDay }: MonthViewProps) {
  const { colors } = useTheme();
  const now = today();
  const weeks = Math.round((diffDays(from, to) + 1) / 7);

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {weekdays.map((day, index) => (
          <AppText key={index} variant="label" color="textTertiary" style={styles.weekday}>
            {day}
          </AppText>
        ))}
      </View>
      {Array.from({ length: weeks }, (_, week) => (
        <View key={week} style={styles.row}>
          {Array.from({ length: 7 }, (_, index) => {
            const date = addDays(from, week * 7 + index);
            const day = sessions.filter((session) => session.scheduledDate === date);
            const inMonth = date.slice(0, 7) === month.slice(0, 7);
            const isToday = date === now;
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={`${date}, ${day.length} sessions`}
                disabled={day.length === 0}
                onPress={() => onPressDay(date)}
                style={({ pressed }) => [
                  styles.cell,
                  isToday && { backgroundColor: colors.accentSubtle },
                  pressed && styles.pressed,
                ]}>
                <AppText
                  variant="bodyStrong"
                  color={isToday ? 'accentText' : inMonth ? 'textPrimary' : 'textTertiary'}>
                  {Number(date.slice(8))}
                </AppText>
                <View style={styles.dots}>
                  {day.slice(0, MAX_DOTS).map((session) => {
                    const color = session.program?.color ?? colors.textSecondary;
                    const filled = session.status === 'done' || session.status === 'in_progress';
                    const missed = session.status === 'missed';
                    return (
                      <View
                        key={session.scheduledSessionId ?? session.workoutId}
                        style={[
                          styles.dot,
                          missed
                            ? { backgroundColor: colors.missed, borderColor: colors.missed }
                            : { borderColor: color, backgroundColor: filled ? color : 'transparent' },
                        ]}
                      />
                    );
                  })}
                </View>
                {day.length > MAX_DOTS ? (
                  <AppText variant="caption" color="textSecondary">
                    +{day.length - MAX_DOTS}
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[1] },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', paddingVertical: space[1] },
  cell: {
    flex: 1,
    minHeight: space[16],
    alignItems: 'center',
    paddingTop: space[1],
    gap: space[1],
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 7, height: 7, borderRadius: radius.full, borderWidth: 1.5 },
  pressed: { opacity: 0.6 },
});
