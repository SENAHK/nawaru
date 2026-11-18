import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ChoiceChip } from '@/components/choice-chip';
import { Sheet } from '@/components/sheet';
import { fingerCounts, gripTypes, type FingerCount, type GripType } from '@/db/enums';
import { recentGrips } from '@/db/queries/log';
import { useDbQuery } from '@/db/use-db-version';
import { formatGrip } from '@/lib/format';
import { fingerCountLabels, gripTypeLabels } from '@/lib/labels';
import { space } from '@/theme';

type Grip = { gripType: GripType | null; fingerCount: FingerCount | null };

type GripSheetProps = {
  visible: boolean;
  value: Grip;
  onChange: (value: Grip) => void;
  onClose: () => void;
};

// GripPicker (docs/design-system.md): recent combinations first, then grip
// type and fingers. The hand comes from the prescription's side.
export function GripSheet({ visible, value, onChange, onClose }: GripSheetProps) {
  const recent = useDbQuery(() => (visible ? recentGrips() : []), `grips:${visible}`);

  return (
    <Sheet visible={visible} title="Grip" onClose={onClose}>
      {recent.length > 0 ? (
        <Group title="Recent">
          {recent.map((grip) => (
            <ChoiceChip
              key={`${grip.gripType}:${grip.fingerCount}`}
              label={formatGrip(grip)}
              selected={grip.gripType === value.gripType && grip.fingerCount === value.fingerCount}
              onPress={() => {
                onChange(grip);
                onClose();
              }}
            />
          ))}
        </Group>
      ) : null}

      <Group title="Grip type">
        {gripTypes.map((gripType) => (
          <ChoiceChip
            key={gripType}
            label={gripTypeLabels[gripType]}
            selected={value.gripType === gripType}
            onPress={() => onChange({ ...value, gripType })}
          />
        ))}
      </Group>

      <Group title="Fingers">
        {fingerCounts.map((fingerCount) => (
          <ChoiceChip
            key={fingerCount}
            label={fingerCountLabels[fingerCount]}
            selected={value.fingerCount === fingerCount}
            onPress={() => onChange({ ...value, fingerCount })}
          />
        ))}
      </Group>
    </Sheet>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <AppText variant="label" color="textSecondary">
        {title}
      </AppText>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
