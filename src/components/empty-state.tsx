import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { space, useTheme } from '@/theme';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, text, action }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.root}>
      {Icon ? <Icon size={space[10]} strokeWidth={1.75} color={colors.textTertiary} /> : null}
      <AppText variant="title2" style={styles.centered}>
        {title}
      </AppText>
      {text ? (
        <AppText color="textSecondary" style={styles.centered}>
          {text}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    padding: space[6],
  },
  centered: { textAlign: 'center' },
});
