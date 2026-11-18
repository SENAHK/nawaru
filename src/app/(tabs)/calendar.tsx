import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChip } from '@/components/choice-chip';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { Sheet } from '@/components/sheet';
import { getCalendarPrograms } from '@/db/queries/enrollment';
import { getCalendarSessions, type SessionSummary } from '@/db/queries/schedule';
import { useDbQuery } from '@/db/use-db-version';
import { MonthView } from '@/features/calendar/month-view';
import { SessionLine, WeekView } from '@/features/calendar/week-view';
import { openSession } from '@/features/session/session-card';
import { addDays, endOfMonth, mondayOf, startOfMonth, today } from '@/lib/dates';
import { formatDate, formatMonth, formatWeekRange } from '@/lib/format';
import { space } from '@/theme';

type Mode = 'week' | 'month';
const FREE = 'free';

// S2 Calendar (docs/screens.md).
export default function CalendarScreen() {
  const [mode, setMode] = useState<Mode>('week');
  const [anchor, setAnchor] = useState(today);
  // Filters are kept as what is hidden, so new programs show up by default.
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [day, setDay] = useState<string | null>(null);
  const [pending, setPending] = useState<SessionSummary | null>(null);

  const monday = mondayOf(anchor);
  const month = startOfMonth(anchor);
  const from = mode === 'week' ? monday : mondayOf(month);
  const to = mode === 'week' ? addDays(monday, 6) : addDays(mondayOf(endOfMonth(month)), 6);

  const programs = useDbQuery(getCalendarPrograms, 'calendar-programs');
  const all = useDbQuery(() => getCalendarSessions(from, to), `${from}:${to}`);
  const sessions = all.filter((session) => !hidden.has(session.program?.id ?? FREE));

  const move = (direction: 1 | -1) =>
    setAnchor(mode === 'week' ? addDays(monday, direction * 7) : startOfMonth(anchor, direction));
  const toggle = (id: string) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const daySessions = day ? sessions.filter((session) => session.scheduledDate === day) : [];

  return (
    <Screen
      title={mode === 'week' ? formatWeekRange(from, to) : formatMonth(month)}
      headerRight={
        <View style={styles.nav}>
          <IconButton icon={ChevronLeft} label={`Previous ${mode}`} onPress={() => move(-1)} />
          <IconButton icon={ChevronRight} label={`Next ${mode}`} onPress={() => move(1)} />
        </View>
      }>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <View style={styles.modeRow}>
          <View style={styles.mode}>
            <SegmentedControl
              options={[
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
              ]}
              value={mode}
              onChange={setMode}
            />
          </View>
          <Button title="Today" variant="secondary" onPress={() => setAnchor(today())} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {programs.map((program) => (
            <ChoiceChip
              key={program.programId}
              label={program.name}
              dotColor={program.color}
              selected={!hidden.has(program.programId)}
              onPress={() => toggle(program.programId)}
            />
          ))}
          <ChoiceChip label="Free sessions" selected={!hidden.has(FREE)} onPress={() => toggle(FREE)} />
        </ScrollView>

        {mode === 'week' ? (
          <WeekView monday={monday} sessions={sessions} />
        ) : (
          <MonthView from={from} to={to} month={month} sessions={sessions} onPressDay={setDay} />
        )}
      </ScrollView>

      <Sheet
        visible={day != null}
        title={day ? formatDate(day) : ''}
        onClose={() => setDay(null)}
        onDismiss={() => {
          // Navigate once the sheet is gone, or the push is lost under it.
          if (pending) openSession(pending);
          setPending(null);
        }}>
        {daySessions.map((session) => (
          <SessionLine
            key={session.scheduledSessionId ?? session.workoutId}
            session={session}
            onPress={() => {
              setPending(session);
              setDay(null);
            }}
          />
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center' },
  content: { gap: space[3], paddingTop: space[2], paddingBottom: space[16] },
  filters: { gap: space[2] },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  mode: { flex: 1 },
});
