import { Check, X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Stepper } from '@/components/stepper';
import type { DosageScheme } from '@/db/enums';
import { formatAddedLoad, formatDuration } from '@/lib/format';
import { radius, space, touch, useTheme } from '@/theme';

import type { LogRow } from './rows';
import type { RowValues } from './store';

type SetRowProps = {
  row: LogRow;
  scheme: DosageScheme;
  /** Reps prescribed per set, shown as "3/5" for intervals. */
  targetReps: number | null;
  current: boolean;
  /** Shown when the exercise records a load. */
  showLoad: boolean;
  /** Opens the grade picker; set when the exercise records grades. */
  onPickGrade?: () => void;
  onChange: (values: RowValues) => void;
};

export function SetRow({ row, scheme, targetReps, current, showLoad, onPickGrade, onChange }: SetRowProps) {
  const { colors } = useTheme();
  const muted = !row.edited && !row.done;
  const failed = row.result === 'fail';
  const number = row.itemIndex ?? row.setIndex;
  const sideLabel = row.side === 'left' ? 'L' : row.side === 'right' ? 'R' : null;
  const durationStep = scheme === 'free_duration' ? 60 : 1;
  // Free duration: set 1 is the session time, the next ones are climbs.
  const climb = scheme === 'free_duration' && row.setIndex > 1;
  const climbNumber = climb ? row.setIndex - 1 : number;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.surface, borderColor: current ? colors.accent : colors.border },
        current && styles.current,
      ]}>
      <View
        style={[
          styles.number,
          row.done
            ? { backgroundColor: failed ? colors.danger : colors.success }
            : { borderWidth: 1, borderColor: colors.borderStrong },
        ]}>
        <AppText variant="bodyStrong" color={row.done ? 'onAccent' : 'textSecondary'}>
          {sideLabel ?? climbNumber}
        </AppText>
      </View>

      {scheme === 'circuit' || scheme === 'slots' || climb ? (
        <AppText style={styles.label} color={muted ? 'textSecondary' : 'textPrimary'}>
          {scheme === 'circuit' ? `Climb ${row.itemIndex}` : climb ? `Climb ${climbNumber}` : `Slot ${row.setIndex}`}
        </AppText>
      ) : null}

      {onPickGrade && (scheme === 'circuit' || scheme === 'slots' || climb) ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={row.grade ? `Grade ${row.grade}` : 'Choose grade'}
          onPress={onPickGrade}
          style={({ pressed }) => [
            styles.grade,
            { backgroundColor: colors.surfaceSunken },
            pressed && styles.pressed,
          ]}>
          <AppText variant="bodyStrong" color={row.grade ? 'textPrimary' : 'textTertiary'}>
            {row.grade ?? 'Grade'}
          </AppText>
        </Pressable>
      ) : null}

      {row.reps != null || scheme === 'reps' || scheme === 'intervals' ? (
        <Stepper
          label="reps"
          value={row.reps}
          muted={muted}
          max={100}
          format={(reps) => (scheme === 'intervals' && targetReps ? `${reps}/${targetReps}` : String(reps))}
          onChange={(reps) => onChange({ reps })}
        />
      ) : null}

      {scheme === 'isometric' || (scheme === 'free_duration' && !climb) ? (
        <Stepper
          label="duration"
          value={row.durationS}
          muted={muted}
          step={durationStep}
          max={scheme === 'free_duration' ? 6 * 3600 : 3600}
          format={formatDuration}
          inputHint="Seconds, or m:ss"
          onChange={(durationS) => onChange({ durationS })}
        />
      ) : null}

      {showLoad && (scheme === 'reps' || scheme === 'isometric' || scheme === 'intervals') ? (
        <Stepper
          label="load"
          value={row.loadKg}
          muted={muted}
          min={-100}
          max={200}
          format={formatAddedLoad}
          inputHint="Added load in kg (negative = assisted)"
          onChange={(loadKg) => onChange({ loadKg })}
        />
      ) : null}

      {scheme !== 'free_duration' || climb ? (
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: !failed }}
          accessibilityLabel={failed ? 'Failed' : 'Succeeded'}
          onPress={() => onChange({ result: failed ? 'success' : 'fail' })}
          style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
          {failed ? (
            <X size={24} strokeWidth={1.75} color={colors.danger} />
          ) : (
            <Check size={24} strokeWidth={1.75} color={muted ? colors.textTertiary : colors.success} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: touch.workout + space[2],
    padding: space[2],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  current: { borderWidth: 2 },
  number: {
    width: space[8],
    height: space[8],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  label: { flex: 1 },
  grade: {
    minWidth: space[16],
    height: touch.min,
    paddingHorizontal: space[3],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  result: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
});
