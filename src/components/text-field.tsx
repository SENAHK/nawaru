import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { radius, space, touch, typography, useTheme } from '@/theme';

export function TextField({ style, ...rest }: TextInputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textTertiary}
      selectionColor={colors.accent}
      style={[
        typography.body,
        styles.root,
        { backgroundColor: colors.surfaceSunken, color: colors.textPrimary, borderColor: colors.border },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: touch.min,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    // The line height of the text style clips the caret in a single-line input.
    lineHeight: undefined,
  },
});
