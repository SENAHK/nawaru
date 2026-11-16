import { Hammer } from 'lucide-react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';

// Temporary body for routes that exist in the navigation but are not built yet.
export function PlaceholderScreen({ title, withHeader = true }: { title: string; withHeader?: boolean }) {
  return (
    <Screen title={withHeader ? title : undefined} edges={withHeader ? ['top'] : []}>
      <EmptyState icon={Hammer} title={title} text="Not built yet." />
    </Screen>
  );
}
