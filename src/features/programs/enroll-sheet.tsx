import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ChoiceChip } from '@/components/choice-chip';
import { Sheet } from '@/components/sheet';
import { showToast } from '@/components/toast';
import { enrollInProgram, nextProgramColor } from '@/db/queries/enrollment';
import { enrollMondays } from '@/features/schedule/schedule';
import { today } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { programColors, radius, space, touch, useTheme } from '@/theme';

type EnrollSheetProps = {
  program: { programId: string; name: string } | null;
  onClose: () => void;
};

// EnrollSheet (docs/screens.md S7): a Monday, from this week on, and a colour.
export function EnrollSheet({ program, onClose }: EnrollSheetProps) {
  return (
    <Sheet visible={program != null} title={program ? `Enroll · ${program.name}` : ''} onClose={onClose}>
      {/* Remounted per program so the defaults are fresh each time. */}
      {program ? <EnrollForm key={program.programId} programId={program.programId} onDone={onClose} /> : null}
    </Sheet>
  );
}

function EnrollForm({ programId, onDone }: { programId: string; onDone: () => void }) {
  const { colors } = useTheme();
  const [{ mondays, defaultMonday }] = useState(() => enrollMondays(today()));
  const [start, setStart] = useState(defaultMonday);
  const [color, setColor] = useState(nextProgramColor);

  const submit = () => {
    enrollInProgram(programId, start, color);
    onDone();
    showToast(`Enrolled · starts ${formatDate(start)}`);
  };

  return (
    <>
      <View style={styles.group}>
        <AppText variant="label" color="textSecondary">
          Start on
        </AppText>
        <View style={styles.chips}>
          {mondays.map((monday, index) => (
            <ChoiceChip
              key={monday}
              label={index === 0 ? `This week · ${formatDate(monday)}` : formatDate(monday)}
              selected={start === monday}
              onPress={() => setStart(monday)}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="label" color="textSecondary">
          Colour
        </AppText>
        <View style={styles.chips}>
          {programColors.map((option, index) => (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected: option === color }}
              accessibilityLabel={`Colour ${index + 1}`}
              onPress={() => setColor(option)}
              style={[styles.swatchRing, { borderColor: option === color ? colors.textPrimary : 'transparent' }]}>
              <View style={[styles.swatch, { backgroundColor: option }]} />
            </Pressable>
          ))}
        </View>
      </View>

      <Button title="Enroll" size="lg" onPress={submit} />
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  swatchRing: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 2,
  },
  swatch: { width: space[8], height: space[8], borderRadius: radius.full },
});
