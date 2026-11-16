import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { radius, touch, useTheme } from '@/theme';

type IconButtonProps = {
  icon: LucideIcon;
  label: string;
  size?: 'md' | 'timer';
  onPress?: () => void;
};

const sizes = { md: touch.min, timer: touch.timer } as const;

export function IconButton({ icon: Icon, label, size = 'md', onPress }: IconButtonProps) {
  const { colors } = useTheme();
  const dimension = sizes[size];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        { width: dimension, height: dimension, opacity: pressed ? 0.6 : 1 },
      ]}>
      <Icon size={24} strokeWidth={1.75} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
});
