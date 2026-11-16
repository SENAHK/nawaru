import { router } from 'expo-router';
import { Settings } from 'lucide-react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { useSession } from '@/features/timer/store';
import { formatDate } from '@/lib/format';

export default function TodayScreen() {
  const title = formatDate(new Date());
  const session = useSession();

  return (
    <Screen
      title={title}
      headerRight={
        <IconButton icon={Settings} label="Settings" onPress={() => router.push('/settings')} />
      }>
      {/* Provisional: stands in for the persistent session bar. */}
      {session?.timer ? (
        <Button
          title={`Resume ${session.exerciseName}`}
          size="lg"
          onPress={() =>
            router.push({
              pathname: '/log/[exerciseLogId]',
              params: { exerciseLogId: session.exerciseLogId },
            })
          }
        />
      ) : null}
      <EmptyState
        title="Start a program"
        text="Create your own or follow one from your coach."
      />
    </Screen>
  );
}
