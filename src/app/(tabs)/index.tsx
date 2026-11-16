import { router } from 'expo-router';
import { Settings } from 'lucide-react-native';

import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { formatDate } from '@/lib/format';

export default function TodayScreen() {
  const title = formatDate(new Date());

  return (
    <Screen
      title={title}
      headerRight={
        <IconButton icon={Settings} label="Settings" onPress={() => router.push('/settings')} />
      }>
      <EmptyState
        title="Start a program"
        text="Create your own or follow one from your coach."
      />
    </Screen>
  );
}
