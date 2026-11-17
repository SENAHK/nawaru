import { useLocalSearchParams } from 'expo-router';

import { getScheduledSessions } from '@/db/queries/schedule';
import { useDbQuery } from '@/db/use-db-version';
import { SessionView } from '@/features/session/session-view';

export default function ScheduledSessionScreen() {
  const { scheduledSessionId } = useLocalSearchParams<{ scheduledSessionId: string }>();
  const session = useDbQuery(
    () => getScheduledSessions({ scheduledSessionId })[0] ?? null,
    scheduledSessionId,
  );
  return <SessionView session={session} />;
}
