import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

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
  /** Unit typed in the keyboard entry, e.g. "kg", "seconds or m:ss". */
  inputHint?: string;
};

const REPEAT_DELAY_MS = 350;
const REPEAT_EVERY_MS = 80;

/** "2:30" → 150, "12.5" → 12.5, "−5" → -5. */
function parseInput(text: string): number | null {
  const clean = text.trim().replace(',', '.').replace('−', '-');
  if (clean.includes(':')) {
    const [minutes, seconds] = clean.split(':').map(Number);
    return Number.isFinite(minutes) && Number.isFinite(seconds) ? minutes * 60 + seconds : null;
  }
  const value = Number(clean);
  return clean !== '' && Number.isFinite(value) ? value : null;
}

// Tap the value to type it; hold − or + to repeat.
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
  inputHint,
}: StepperProps) {
  const { colors } = useTheme();
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  // Holding a button keeps changing from the latest value, not the rendered one.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRepeat = () => {
    if (repeat.current) clearInterval(repeat.current);
    repeat.current = null;
  };
  useEffect(() => stopRepeat, []);

  const change = (direction: 1 | -1) => {
    const current = latest.current;
    const next = clamp(current == null ? initial : current + direction * step);
    latest.current = next;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange(next);
  };

  const startRepeat = (direction: 1 | -1) => {
    stopRepeat();
    change(direction);
    repeat.current = setInterval(() => change(direction), REPEAT_EVERY_MS);
  };

  const type = () =>
    Alert.prompt(
      label.charAt(0).toUpperCase() + label.slice(1),
      inputHint,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: (text?: string) => {
            const parsed = parseInput(text ?? '');
            if (parsed != null) onChange(clamp(parsed));
          },
        },
      ],
      'plain-text',
      value == null ? '' : String(value),
      'numbers-and-punctuation',
    );

  return (
    <View style={[styles.root, { backgroundColor: colors.surfaceSunken }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        onPress={() => change(-1)}
        onLongPress={() => startRepeat(-1)}
        delayLongPress={REPEAT_DELAY_MS}
        onPressOut={stopRepeat}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Minus size={20} strokeWidth={1.75} color={colors.textSecondary} />
      </Pressable>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: value == null ? 'empty' : format(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => change(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
        onPress={type}
        style={styles.valueBox}>
        <AppText
          variant="bodyStrong"
          numberOfLines={1}
          adjustsFontSizeToFit
          color={value == null ? 'textTertiary' : muted ? 'textSecondary' : 'textPrimary'}
          style={styles.value}>
          {value == null ? '–' : format(value)}
        </AppText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        onPress={() => change(1)}
        onLongPress={() => startRepeat(1)}
        delayLongPress={REPEAT_DELAY_MS}
        onPressOut={stopRepeat}
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
  valueBox: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  value: { textAlign: 'center', fontVariant: ['tabular-nums'] },
});
