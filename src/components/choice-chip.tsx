import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { radius, space, touch, useTheme } from '@/theme';

type ChoiceChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Program colour, shown as a dot before the label (calendar filter). */
  dotColor?: string | null;
};

/** Selectable chip used by the pickers (grip, grade, effort). */
export function ChoiceChip({ label, selected, onPress, dotColor }: ChoiceChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.root,
        selected
          ? { backgroundColor: colors.accent, borderColor: colors.accent }
          : { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}>
      {dotColor ? (
        <View style={[styles.dot, { backgroundColor: dotColor, borderColor: selected ? colors.onAccent : 'transparent' }]} />
      ) : null}
      <AppText variant="bodyStrong" color={selected ? 'onAccent' : 'textPrimary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    minWidth: touch.min,
    minHeight: touch.min,
    paddingHorizontal: space[3],
    flexDirection: 'row',
    gap: space[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  pressed: { opacity: 0.6 },
  dot: { width: space[3], height: space[3], borderRadius: radius.full, borderWidth: 1.5 },
});
