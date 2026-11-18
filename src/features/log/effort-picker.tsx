import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ChoiceChip } from '@/components/choice-chip';
import type { EffortScale } from '@/db/enums';
import { effortTitles, effortValues, formatEffort } from '@/lib/effort';
import { space } from '@/theme';

type EffortPickerProps = {
  scale: EffortScale;
  value: number | null;
  onChange: (value: number | null) => void;
};

/** One row of chips, single selection; tapping the selected chip clears it. */
export function EffortPicker({ scale, value, onChange }: EffortPickerProps) {
  return (
    <View style={styles.root}>
      <AppText variant="label" color="textSecondary">
        {effortTitles[scale]}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {effortValues(scale).map((option) => (
          <ChoiceChip
            key={option}
            label={formatEffort(scale, option)}
            selected={value === option}
            onPress={() => onChange(value === option ? null : option)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[2] },
  chips: { gap: space[2] },
});
