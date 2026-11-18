import { router } from 'expo-router';
import { ChevronDown, ChevronRight, Moon, Settings } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { ListItem } from '@/components/list-item';
import { Screen } from '@/components/screen';
import { getTodayData } from '@/db/queries/schedule';
import { useDbQuery } from '@/db/use-db-version';
import { openSession, SessionCard } from '@/features/session/session-card';
import { useSession } from '@/features/timer/store';
import { today } from '@/lib/dates';
import { formatAddedLoad, formatDate, formatGrip } from '@/lib/format';
import { space, useTheme } from '@/theme';

const HAS_SESSION_BAR = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

// S1 Today (docs/screens.md).
export default function TodayScreen() {
  const { colors } = useTheme();
  const date = today();
  const data = useDbQuery(() => getTodayData(date), date);
  const activeSession = useSession();
  const [missedOpen, setMissedOpen] = useState(false);

  const nothingToday = data.sessions.length === 0 && data.freeSessions.length === 0;
  const reference = data.lastReference;

  return (
    <Screen
      title={formatDate(date)}
      headerRight={
        <IconButton icon={Settings} label="Settings" onPress={() => router.push('/settings')} />
      }>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {/* The session bar sits above the tab bar from iOS 26; earlier versions resume from here. */}
        {!HAS_SESSION_BAR && activeSession?.timer ? (
          <Button
            title={`Resume ${activeSession.exerciseName}`}
            size="lg"
            onPress={() =>
              router.push({
                pathname: '/log/[exerciseLogId]',
                params: { exerciseLogId: activeSession.exerciseLogId },
              })
            }
          />
        ) : null}

        {data.sessions.map((session) => (
          <SessionCard key={session.scheduledSessionId} session={session} />
        ))}
        {data.freeSessions.map((session) => (
          <SessionCard key={session.workoutId} session={session} />
        ))}

        {nothingToday && !data.hasActiveProgram ? (
          <View style={styles.empty}>
            <EmptyState
              title="Start a program"
              text="Create your own or follow one from your coach."
              action={<Button title="Go to programs" onPress={() => router.navigate('/programs')} />}
            />
          </View>
        ) : null}
        {nothingToday && data.hasActiveProgram ? (
          <View style={styles.empty}>
            <EmptyState
              icon={Moon}
              title="Rest day"
              text={
                data.next
                  ? `Next: ${formatDate(data.next.scheduledDate)} · ${data.next.title}`
                  : 'No session planned'
              }
            />
          </View>
        ) : null}

        <Button
          title="Add exercise"
          variant="secondary"
          onPress={() => router.push('/add-exercise')}
        />

        {data.missed.length > 0 ? (
          <View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: missedOpen }}
              onPress={() => setMissedOpen((open) => !open)}
              style={styles.sectionHeader}>
              <AppText variant="label" color="textSecondary">
                Missed · {data.missed.length}
              </AppText>
              {missedOpen ? (
                <ChevronDown size={20} strokeWidth={1.75} color={colors.textSecondary} />
              ) : (
                <ChevronRight size={20} strokeWidth={1.75} color={colors.textSecondary} />
              )}
            </Pressable>
            {missedOpen
              ? data.missed.map((session) => (
                  <ListItem
                    key={session.scheduledSessionId}
                    title={session.title}
                    subtitle={`${formatDate(session.scheduledDate)} · ${session.program?.name ?? ''}`}
                    dotColor={session.program?.color ?? undefined}
                    right={<ChevronRight size={20} strokeWidth={1.75} color={colors.textTertiary} />}
                    onPress={() => openSession(session)}
                  />
                ))
              : null}
          </View>
        ) : null}

        {data.hasActiveProgram ? (
          <View style={styles.section}>
            <AppText variant="label" color="textSecondary">
              This week
            </AppText>
            <View style={styles.stats}>
              <Card style={styles.stat}>
                <AppText variant="bodySm" color="textSecondary">
                  Sessions
                </AppText>
                <AppText variant="displayM">
                  {data.week.done} / {data.week.planned}
                </AppText>
              </Card>
              <Card style={styles.stat}>
                <AppText variant="bodySm" color="textSecondary">
                  Last max hang
                </AppText>
                <AppText variant={reference ? 'displayM' : 'title2'}>
                  {reference ? formatAddedLoad(reference.valueKg) : 'No test yet'}
                </AppText>
                {reference ? (
                  <AppText variant="bodySm" color="textSecondary">
                    {[reference.edgeMm != null ? `${reference.edgeMm} mm` : null, formatGrip(reference)]
                      .filter(Boolean)
                      .join(' · ')}
                  </AppText>
                ) : null}
              </Card>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space[3], paddingTop: space[2], paddingBottom: space[16] },
  empty: { minHeight: 220 },
  section: { gap: space[3] },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: space[12],
  },
  stats: { flexDirection: 'row', gap: space[3] },
  stat: { flex: 1, gap: space[1] },
});
