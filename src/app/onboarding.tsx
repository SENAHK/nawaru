import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { SegmentedControl } from '@/components/segmented-control';
import { Stepper } from '@/components/stepper';
import { TextField } from '@/components/text-field';
import { completeOnboarding, type OnboardingValues } from '@/db/queries/profile';
import { space, useTheme } from '@/theme';

type Units = Required<Pick<OnboardingValues, 'weightUnit' | 'boulderGradeSystem' | 'routeGradeSystem'>>;

const KG_PER_LB = 0.45359237;

// S0 Onboarding (docs/screens.md). The navigator leaves this screen by itself
// once the athlete profile exists.
export default function OnboardingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [units, setUnits] = useState<Units>({
    weightUnit: 'kg',
    boulderGradeSystem: 'font',
    routeGradeSystem: 'french',
  });
  /** In the unit selected above. */
  const [bodyweight, setBodyweight] = useState<number | null>(null);

  const submit = () =>
    completeOnboarding({
      displayName: name.trim(),
      ...units,
      bodyweightKg:
        bodyweight == null ? null : units.weightUnit === 'kg' ? bodyweight : bodyweight * KG_PER_LB,
    });

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space[8], paddingBottom: insets.bottom + space[6] },
        ]}>
        <View style={styles.heading}>
          <AppText variant="title1" accessibilityRole="header">
            Welcome to Nawaru
          </AppText>
          <AppText color="textSecondary">A few settings before your first session.</AppText>
        </View>

        <Field label="Name">
          <TextField
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
          />
        </Field>

        <Field label="Weight unit">
          <SegmentedControl
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lbs', label: 'lbs' },
            ]}
            value={units.weightUnit}
            onChange={(weightUnit) => {
              setUnits({ ...units, weightUnit });
              setBodyweight(null);
            }}
          />
        </Field>

        <Field label="Boulder grades">
          <SegmentedControl
            options={[
              { value: 'font', label: 'Font' },
              { value: 'v_scale', label: 'V-scale' },
            ]}
            value={units.boulderGradeSystem}
            onChange={(boulderGradeSystem) => setUnits({ ...units, boulderGradeSystem })}
          />
        </Field>

        <Field label="Route grades">
          <SegmentedControl
            options={[
              { value: 'french', label: 'French' },
              { value: 'yds', label: 'YDS' },
            ]}
            value={units.routeGradeSystem}
            onChange={(routeGradeSystem) => setUnits({ ...units, routeGradeSystem })}
          />
        </Field>

        <Field label="Bodyweight (optional)" help="Used to show hangs as % of bodyweight">
          <View style={styles.stepperRow}>
            <Stepper
              label="bodyweight"
              value={bodyweight}
              onChange={setBodyweight}
              step={units.weightUnit === 'kg' ? 0.5 : 1}
              min={20}
              max={units.weightUnit === 'kg' ? 250 : 550}
              initial={units.weightUnit === 'kg' ? 70 : 155}
              format={(value) => `${value} ${units.weightUnit}`}
            />
          </View>
        </Field>

        <Button title="Get started" size="lg" disabled={name.trim().length === 0} onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
      {children}
      {help ? (
        <AppText variant="caption" color="textTertiary">
          {help}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: space[4], gap: space[6] },
  heading: { gap: space[2] },
  field: { gap: space[2] },
  stepperRow: { flexDirection: 'row' },
});
