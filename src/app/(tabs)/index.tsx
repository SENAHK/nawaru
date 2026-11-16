import { router } from 'expo-router';
import { Settings } from 'lucide-react-native';

import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

export default function TodayScreen() {
  // "Mon 12 Jan" (design-system.md §10)
  const title = dateFormat.format(new Date()).replace(',', '');

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
