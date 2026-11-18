import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChip } from '@/components/choice-chip';
import { Sheet } from '@/components/sheet';
import { boulderGrades, type BoulderGradeSystem } from '@/lib/grades';
import { space } from '@/theme';

type GradeSheetProps = {
  visible: boolean;
  system: BoulderGradeSystem;
  value: string | null;
  onChange: (grade: string | null) => void;
  onClose: () => void;
  /** Free duration climbs can be removed from here. */
  onRemove?: () => void;
};

export function GradeSheet({ visible, system, value, onChange, onClose, onRemove }: GradeSheetProps) {
  return (
    <Sheet
      visible={visible}
      title="Grade"
      onClose={onClose}
      footer={
        onRemove ? (
          <Button
            title="Remove climb"
            variant="destructive"
            onPress={() => {
              onRemove();
              onClose();
            }}
          />
        ) : null
      }>
      <View style={styles.grid}>
        {boulderGrades(system).map((grade) => (
          <ChoiceChip
            key={grade}
            label={grade}
            selected={value === grade}
            onPress={() => {
              onChange(value === grade ? null : grade);
              onClose();
            }}
          />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
