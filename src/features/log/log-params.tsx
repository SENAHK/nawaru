import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Stepper } from '@/components/stepper';
import { editDetails, setLoadForSets, type Session } from '@/features/timer/store';
import { formatAddedLoad, formatGrip } from '@/lib/format';
import { radius, space, touch, useTheme } from '@/theme';

import { GripSheet } from './grip-sheet';

const LOAD_SCHEMES = new Set(['reps', 'isometric', 'intervals']);

/**
 * Parameters block of S5: grip, edge and load, shown only for the measures
 * the exercise declares (docs/screens.md, S5).
 */
export function LogParams({ session }: { session: Session }) {
  const { colors } = useTheme();
  const [gripOpen, setGripOpen] = useState(false);
  const [loadChanged, setLoadChanged] = useState(false);
  const { details, measures, dosage } = session;

  const showGrip = measures.includes('grip');
  const showEdge = measures.includes('edge');
  const showLoad = measures.includes('load') && LOAD_SCHEMES.has(dosage.scheme);
  if (!showGrip && !showEdge && !showLoad) return null;

  const grip = formatGrip(details);
  const someDone = session.rows.some((row) => row.done);

  return (
    <View style={[styles.root, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {showGrip ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={grip ? `Grip ${grip}` : 'Choose grip'}
          onPress={() => setGripOpen(true)}
          style={({ pressed }) => [styles.line, pressed && styles.pressed]}>
          <AppText color="textSecondary" style={styles.name}>
            Grip
          </AppText>
          <AppText variant="bodyStrong" color={grip ? 'textPrimary' : 'textTertiary'}>
            {grip || 'Choose'}
          </AppText>
          <ChevronRight size={20} strokeWidth={1.75} color={colors.textTertiary} />
        </Pressable>
      ) : null}

      {showEdge ? (
        <View style={styles.line}>
          <AppText color="textSecondary" style={styles.name}>
            Edge
          </AppText>
          <View style={styles.stepper}>
            <Stepper
              label="edge"
              value={details.edgeMm}
              min={4}
              max={60}
              initial={20}
              format={(mm) => `${mm} mm`}
              inputHint="Millimetres (4 to 60)"
              onChange={(edgeMm) => editDetails({ edgeMm })}
            />
          </View>
        </View>
      ) : null}

      {showLoad ? (
        <View style={styles.line}>
          <AppText color="textSecondary" style={styles.name}>
            Load
          </AppText>
          <View style={styles.stepper}>
            <Stepper
              label="load"
              value={session.targetLoadKg}
              min={-100}
              max={200}
              format={formatAddedLoad}
              inputHint="Added load in kg (negative = assisted)"
              onChange={(loadKg) => {
                // Sets still to do follow the load; done sets keep theirs unless asked.
                setLoadForSets(loadKg, false);
                setLoadChanged(true);
              }}
            />
          </View>
        </View>
      ) : null}
      {showLoad && loadChanged && someDone && session.targetLoadKg != null ? (
        <Button
          title="Apply to all sets"
          variant="ghost"
          onPress={() => {
            setLoadForSets(session.targetLoadKg ?? 0, true);
            setLoadChanged(false);
          }}
        />
      ) : null}

      <GripSheet
        visible={gripOpen}
        value={details}
        onChange={(value) => editDetails(value)}
        onClose={() => setGripOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: touch.workout },
  name: { width: space[16] },
  stepper: { flex: 1, flexDirection: 'row' },
  pressed: { opacity: 0.6 },
});
