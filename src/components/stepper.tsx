import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { radius, touch, useTheme } from '@/theme';

type StepperProps = {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  /** Value used for the first press when the field is empty. */
  initial?: number;
  format?: (value: number) => string;
  /** Pre-filled values read as secondary until the athlete changes them. */
  muted?: boolean;
};

// Long-press repeat and tap-to-type come with the full log screen.
export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  initial = 0,
  format = String,
  muted,
}: StepperProps) {
  const { colors } = useTheme();

  const change = (direction: 1 | -1) => {
    const next = value == null ? initial : value + direction * step;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange(Math.min(max, Math.max(min, next)));
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.surfaceSunken }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        onPress={() => change(-1)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Minus size={20} strokeWidth={1.75} color={colors.textSecondary} />
      </Pressable>
      <AppText
        variant="bodyStrong"
        color={value == null ? 'textTertiary' : muted ? 'textSecondary' : 'textPrimary'}
        style={styles.value}
        accessibilityLabel={label}>
        {value == null ? '–' : format(value)}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        onPress={() => change(1)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Plus size={20} strokeWidth={1.75} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  button: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
  value: { flex: 1, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
