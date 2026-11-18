import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ChoiceChip } from '@/components/choice-chip';
import { Sheet } from '@/components/sheet';
import { Stepper } from '@/components/stepper';
import { showToast } from '@/components/toast';
import { getShiftPlan, resumeEnrollment, shiftEnrollment, type ShiftPlan } from '@/db/queries/enrollment';
import { addDays } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { space } from '@/theme';

const MIN_SHIFT = -4;
const MAX_SHIFT = 8;
// Resuming has no upper limit: the pause may have lasted months.
const MAX_RESUME_SHIFT = 52;

type ShiftSheetProps = {
  /** The enrollment to shift, and whether this is a resume. */
  target: { enrollmentId: string; resume: boolean } | null;
  onClose: () => void;
};

// ShiftSheet (docs/screens.md S7). On resume it is pre-filled with the pause
// week and the whole weeks elapsed since.
export function ShiftSheet({ target, onClose }: ShiftSheetProps) {
  const plan = target ? getShiftPlan(target.enrollmentId) : null;
  return (
    <Sheet
      visible={target != null}
      title={target?.resume ? 'Resume program' : 'Shift weeks'}
      onClose={onClose}>
      {plan && target ? (
        <ShiftForm key={target.enrollmentId} plan={plan} resume={target.resume} onDone={onClose} />
      ) : null}
    </Sheet>
  );
}

function ShiftForm({ plan, resume, onDone }: { plan: ShiftPlan; resume: boolean; onDone: () => void }) {
  const [fromWeek, setFromWeek] = useState(plan.fromWeek);
  const [weeks, setWeeks] = useState(plan.weeks);
  const weekNumbers = Object.keys(plan.weekStarts).map(Number).sort((a, b) => a - b);
  const start = plan.weekStarts[fromWeek];
  const label = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)} ${Math.abs(value) === 1 ? 'week' : 'weeks'}`;

  const submit = () => {
    if (resume) {
      resumeEnrollment(plan.enrollmentId, fromWeek, weeks);
      showToast(weeks === 0 ? 'Program resumed' : `Program resumed, shifted by ${label(weeks)}`);
    } else {
      shiftEnrollment(plan.enrollmentId, fromWeek, weeks);
      showToast(`Program shifted by ${label(weeks)}`);
    }
    onDone();
  };

  return (
    <>
      <AppText color="textSecondary">{plan.name}</AppText>

      <View style={styles.group}>
        <AppText variant="label" color="textSecondary">
          From week
        </AppText>
        <View style={styles.chips}>
          {weekNumbers.map((week) => (
            <ChoiceChip key={week} label={String(week)} selected={week === fromWeek} onPress={() => setFromWeek(week)} />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="label" color="textSecondary">
          Shift by
        </AppText>
        <View style={styles.stepper}>
          <Stepper
            label="shift"
            value={weeks}
            min={MIN_SHIFT}
            max={resume ? MAX_RESUME_SHIFT : MAX_SHIFT}
            format={label}
            inputHint="Whole weeks"
            onChange={(value) => setWeeks(Math.round(value))}
          />
        </View>
      </View>

      {start ? (
        <AppText variant="bodyStrong">
          Week {fromWeek} will start on {formatDate(addDays(start, weeks * 7))}
        </AppText>
      ) : null}
      <AppText variant="bodySm" color="textSecondary">
        {resume && weeks === 0
          ? 'The program picks up where it was. Sessions skipped during the pause show as missed.'
          : 'Sessions already logged stay where they are.'}
      </AppText>

      <Button title={resume ? 'Resume' : 'Shift'} size="lg" onPress={submit} />
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  stepper: { flexDirection: 'row' },
});
