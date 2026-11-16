import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { space, useTheme } from '@/theme';

type ScreenProps = {
  title?: string;
  headerRight?: ReactNode;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Screen({ title, headerRight, edges = ['top'], style, children }: ScreenProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: colors.bg }]}>
      {title ? (
        <View style={styles.header}>
          <AppText variant="title1" accessibilityRole="header">
            {title}
          </AppText>
          {headerRight}
        </View>
      ) : null}
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: space[12],
    paddingHorizontal: space[4],
  },
  content: { flex: 1, paddingHorizontal: space[4] },
});
