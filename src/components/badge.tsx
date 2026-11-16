import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { radius, space, useTheme, type ColorTokens } from '@/theme';

const variants = {
  today: 'textSecondary',
  in_progress: 'accentText',
  done: 'success',
  missed: 'missed',
  paused: 'missed',
  test: 'info',
} as const satisfies Record<string, keyof ColorTokens>;

export function Badge({ variant, label }: { variant: keyof typeof variants; label: string }) {
  const { colors } = useTheme();
  const color = variants[variant];
  return (
    <View style={[styles.root, { borderColor: colors[color] }]}>
      <AppText variant="label" color={color}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
    paddingVertical: space[1] / 2,
    paddingHorizontal: space[2],
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
});
