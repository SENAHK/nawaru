import { Text, type TextProps } from 'react-native';

import { typography, useTheme, type ColorTokens } from '@/theme';

export type AppTextProps = TextProps & {
  variant?: keyof typeof typography;
  color?: keyof ColorTokens;
};

// Dynamic Type is capped at 1.3× so workout screens keep their layout.
const MAX_FONT_SIZE_MULTIPLIER = 1.3;

export function AppText({ variant = 'body', color = 'textPrimary', style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
      style={[typography[variant], { color: colors[color] }, style]}
      {...rest}
    />
  );
}
