import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { radius, space, touch, useTheme } from '@/theme';

type ListItemProps = {
  title: string;
  subtitle?: string;
  /** Category colour, shown as an 8 pt dot. */
  dotColor?: string;
  right?: ReactNode;
  onPress?: () => void;
};

export function ListItem({ title, subtitle, dotColor, right, onPress }: ListItemProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 },
      ]}>
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      <View style={styles.text}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="bodySm" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: touch.workout,
    paddingVertical: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: space[2], height: space[2], borderRadius: radius.full },
  text: { flex: 1, gap: space[1] / 2 },
});
