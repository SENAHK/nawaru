import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Badge } from '@/components/badge';
import type { SessionItem, SessionSummary } from '@/db/queries/schedule';
import type { SessionStatus } from '@/features/schedule/schedule';
import { today } from '@/lib/dates';
import { categoryColors, radius, space } from '@/theme';

export function ProgramDot({ color }: { color: string | null }) {
  return color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null;
}

export function StatusBadge({ status, date }: { status: SessionStatus; date: string }) {
  if (status === 'in_progress') return <Badge variant="in_progress" label="In progress" />;
  if (status === 'done') return <Badge variant="done" label="Done" />;
  if (status === 'missed') return <Badge variant="missed" label="Missed" />;
  return date === today() ? <Badge variant="today" label="Today" /> : null;
}

/** "Week 3 · Day 2 · Finger strength block", or "Free session". */
export function SessionOrigin({ session }: { session: SessionSummary }) {
  const { program } = session;
  return (
    <View style={styles.origin}>
      <ProgramDot color={program?.color ?? null} />
      <AppText variant="bodySm" color="textSecondary" style={styles.originText} numberOfLines={1}>
        {program ? `Week ${program.week} · Day ${program.day} · ${program.name}` : 'Free session'}
      </AppText>
    </View>
  );
}

/** One exercise line: category dot, name, dosage, load on the right. */
export function ExerciseLine({ item }: { item: SessionItem }) {
  return (
    <View style={styles.line}>
      <View style={[styles.dot, { backgroundColor: categoryColors[item.category] }]} />
      <View style={styles.lineText}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText variant="bodySm" color="textSecondary" numberOfLines={1}>
          {item.summary}
        </AppText>
      </View>
      {item.loadLabel ? (
        <AppText variant="bodySm" color="accentText">
          {item.loadLabel}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { width: space[2], height: space[2], borderRadius: radius.full },
  origin: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[2] },
  originText: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  lineText: { flex: 1 },
});
