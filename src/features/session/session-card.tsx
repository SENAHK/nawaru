import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import type { SessionSummary } from '@/db/queries/schedule';
import { space } from '@/theme';

import { ExerciseLine, SessionOrigin, StatusBadge } from './session-parts';

export function openSession(session: SessionSummary) {
  if (session.scheduledSessionId) {
    router.push({
      pathname: '/session/[scheduledSessionId]',
      params: { scheduledSessionId: session.scheduledSessionId },
    });
  } else if (session.workoutId) {
    router.push({ pathname: '/workout/[workoutId]', params: { workoutId: session.workoutId } });
  }
}

const actionLabels = {
  planned: 'Start session',
  missed: 'Log session',
  in_progress: 'Resume',
  done: 'View',
} as const;

/** A session on Today: where it comes from, its exercises, and one action. */
export function SessionCard({ session }: { session: SessionSummary }) {
  return (
    <Card onPress={() => openSession(session)}>
      <View style={styles.header}>
        <SessionOrigin session={session} />
        <StatusBadge status={session.status} date={session.scheduledDate} />
      </View>
      <View style={styles.title}>
        <AppText variant="title3">{session.title}</AppText>
        {session.isTest ? <Badge variant="test" label="Test" /> : null}
      </View>
      <View style={styles.exercises}>
        {session.items.map((item) => (
          <ExerciseLine key={item.key} item={item} />
        ))}
      </View>
      <Button
        title={actionLabels[session.status]}
        variant={session.status === 'done' ? 'secondary' : 'primary'}
        onPress={() => openSession(session)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  title: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  exercises: { gap: space[2] },
});
