import { NativeTabs } from 'expo-router/native-tabs';

import { getActiveWorkout } from '@/db/queries/schedule';
import { useDbQuery } from '@/db/use-db-version';
import { SessionBarContent } from '@/features/session/session-bar';
import { useSession } from '@/features/timer/store';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  // State lives here: iOS renders the accessory content twice.
  const session = useSession();
  const workout = useDbQuery(getActiveWorkout, 'active-workout');
  const showBar = session?.timer != null || workout != null;

  return (
    <NativeTabs tintColor={colors.accent}>
      {showBar ? (
        <NativeTabs.BottomAccessory>
          <SessionBarContent session={session} workout={workout} />
        </NativeTabs.BottomAccessory>
      ) : null}

      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.max', selected: 'sun.max.fill' }} />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Icon sf="calendar" />
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="programs">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'square.stack.3d.up', selected: 'square.stack.3d.up.fill' }}
        />
        <NativeTabs.Trigger.Label>Programs</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} />
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" />
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
