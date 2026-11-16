import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';
import { radius, space, touch, useTheme, type ColorTokens } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const textColors: Record<Variant, keyof ColorTokens> = {
  primary: 'onAccent',
  secondary: 'textPrimary',
  ghost: 'accentText',
  destructive: 'danger',
};

const heights = { md: touch.min, lg: touch.workout } as const;

type ButtonProps = {
  title: string;
  variant?: Variant;
  size?: keyof typeof heights;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  disabled,
  onPress,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        { minHeight: heights[size], opacity: disabled ? 0.4 : 1 },
        variant === 'primary' && {
          backgroundColor: pressed ? colors.accentPressed : colors.accent,
        },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.borderStrong },
        variant !== 'primary' && pressed && { opacity: 0.6 },
        style,
      ]}>
      <AppText variant="bodyStrong" color={textColors[variant]}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
});
