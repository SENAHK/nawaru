import { router } from 'expo-router';

import { Screen } from '@/components/screen';
import { LibraryList } from '@/features/library/library-list';

// S11 Library (docs/screens.md).
export default function LibraryScreen() {
  return (
    <Screen title="Library">
      <LibraryList
        onPress={(exercise) =>
          router.push({ pathname: '/exercise/[exerciseId]', params: { exerciseId: exercise.id } })
        }
      />
    </Screen>
  );
}
