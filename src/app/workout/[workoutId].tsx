import { useLocalSearchParams } from 'expo-router';

import { getFreeWorkouts } from '@/db/queries/schedule';
import { useDbQuery } from '@/db/use-db-version';
import { SessionView } from '@/features/session/session-view';

export default function FreeWorkoutScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const session = useDbQuery(() => getFreeWorkouts({ workoutId })[0] ?? null, workoutId);
  return <SessionView session={session} />;
}
