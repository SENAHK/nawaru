import { ChevronDown, ChevronRight, Ellipsis } from 'lucide-react-native';
import { useState } from 'react';
import { ActionSheetIOS, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { showToast } from '@/components/toast';
import {
  getProgramsOverview,
  pauseEnrollment,
  stopEnrollment,
  type EnrollmentRow,
} from '@/db/queries/enrollment';
import { useDbQuery } from '@/db/use-db-version';
import { EnrollSheet } from '@/features/programs/enroll-sheet';
import { ShiftSheet } from '@/features/programs/shift-sheet';
import { ProgramDot } from '@/features/session/session-parts';
import { today } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { radius, space, useTheme } from '@/theme';

type EnrollTarget = { programId: string; name: string };
type ShiftTarget = { enrollmentId: string; resume: boolean };

// S7 Programs (docs/screens.md). Creating and editing programs come with the
// program editor.
export default function ProgramsScreen() {
  const { colors } = useTheme();
  const data = useDbQuery(getProgramsOverview, 'programs');
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState<EnrollTarget | null>(null);
  const [shiftTarget, setShiftTarget] = useState<ShiftTarget | null>(null);

  const stop = (row: EnrollmentRow) =>
    Alert.alert(
      `Stop ${row.name}?`,
      'Upcoming sessions are removed from your calendar. Sessions already logged are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => {
            stopEnrollment(row.enrollmentId);
            showToast('Program stopped');
          },
        },
      ],
    );

  const openMenu = (row: EnrollmentRow) => {
    const paused = row.status === 'paused';
    const actions = ['Shift weeks', paused ? 'Resume' : 'Pause', 'Stop', 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      { title: row.name, options: actions, destructiveButtonIndex: 2, cancelButtonIndex: 3 },
      (index) => {
        if (index === 0) setShiftTarget({ enrollmentId: row.enrollmentId, resume: false });
        if (index === 1 && paused) setShiftTarget({ enrollmentId: row.enrollmentId, resume: true });
        if (index === 1 && !paused) {
          pauseEnrollment(row.enrollmentId);
          showToast('Program paused');
        }
        if (index === 2) stop(row);
      },
    );
  };

  const nothing = data.active.length === 0 && data.mine.length === 0 && data.archived.length === 0;

  return (
    <Screen title="Programs">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {nothing ? (
          <EmptyState title="No programs yet" text="Programs from your coach show up here." />
        ) : null}

        {data.active.length > 0 ? (
          <Section title="Active">
            {data.active.map((row) => (
              <ActiveCard key={row.enrollmentId} row={row} onMenu={() => openMenu(row)} />
            ))}
          </Section>
        ) : null}

        {data.mine.length > 0 ? (
          <Section title="My programs">
            {data.mine.map((row) => (
              <Card key={row.programId} style={styles.line}>
                <View style={styles.lineText}>
                  <AppText variant="title3">{row.name}</AppText>
                  <AppText variant="bodySm" color="textSecondary">
                    {row.totalWeeks} weeks · by you
                  </AppText>
                </View>
                <Button title="Enroll" variant="secondary" onPress={() => setEnrollTarget(row)} />
              </Card>
            ))}
          </Section>
        ) : null}

        {data.archived.length > 0 ? (
          <View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: archivedOpen }}
              onPress={() => setArchivedOpen((open) => !open)}
              style={styles.sectionHeader}>
              <AppText variant="label" color="textSecondary">
                Archived · {data.archived.length}
              </AppText>
              {archivedOpen ? (
                <ChevronDown size={20} strokeWidth={1.75} color={colors.textSecondary} />
              ) : (
                <ChevronRight size={20} strokeWidth={1.75} color={colors.textSecondary} />
              )}
            </Pressable>
            {archivedOpen ? (
              <View style={styles.section}>
                {data.archived.map((row) => (
                  <Card key={row.enrollmentId} style={styles.line}>
                    <View style={styles.lineText}>
                      <AppText variant="title3">{row.name}</AppText>
                      <AppText variant="bodySm" color="textSecondary">
                        {row.totalWeeks} weeks · by {row.author}
                      </AppText>
                    </View>
                    <Button title="Enroll again" variant="secondary" onPress={() => setEnrollTarget(row)} />
                  </Card>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <EnrollSheet program={enrollTarget} onClose={() => setEnrollTarget(null)} />
      <ShiftSheet target={shiftTarget} onClose={() => setShiftTarget(null)} />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" color="textSecondary">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function ActiveCard({ row, onMenu }: { row: EnrollmentRow; onMenu: () => void }) {
  const { colors } = useTheme();
  const notStarted = row.currentWeek <= 1 && row.startDate > today();
  const week = Math.min(row.currentWeek, row.totalWeeks);
  const progress = row.finished ? 1 : notStarted ? 0 : week / row.totalWeeks;
  const status = row.finished
    ? 'All sessions done or past'
    : notStarted
      ? `Starts ${formatDate(row.startDate)}`
      : `Week ${week} of ${row.totalWeeks}`;

  return (
    <Card>
      <View style={styles.line}>
        <ProgramDot color={row.color} />
        <View style={styles.lineText}>
          <AppText variant="title3">{row.name}</AppText>
          <AppText variant="bodySm" color="textSecondary">
            by {row.author}
          </AppText>
        </View>
        {row.status === 'paused' ? <Badge variant="paused" label="Paused" /> : null}
        <IconButton icon={Ellipsis} label={`${row.name} actions`} onPress={onMenu} />
      </View>
      <AppText variant="bodySm" color="textSecondary">
        {row.status === 'paused' && row.pausedAt ? `Paused since ${formatDate(row.pausedAt)} · ${status}` : status}
      </AppText>
      <View style={[styles.track, { backgroundColor: colors.surfaceSunken }]}>
        <View
          style={[
            styles.fill,
            { width: `${Math.round(progress * 100)}%`, backgroundColor: row.color ?? colors.accent },
          ]}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: space[6], paddingTop: space[2], paddingBottom: space[16] },
  section: { gap: space[3] },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: space[12],
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  lineText: { flex: 1, gap: space[1] },
  track: { height: space[1], borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
});
