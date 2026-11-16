import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { radius, space, useTheme } from '@/theme';

/** Read-only info chip. The toggle (filter) variant comes with the Library filters. */
export function Chip({ label, emphasis = false }: { label: string; emphasis?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.root,
        emphasis
          ? { backgroundColor: colors.accentSubtle, borderColor: 'transparent' }
          : { borderColor: colors.border },
      ]}>
      <AppText variant="bodySm" color={emphasis ? 'accentText' : 'textSecondary'}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: space[1],
    paddingHorizontal: space[2],
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
