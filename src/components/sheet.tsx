import type { ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { space, useTheme } from '@/theme';

type SheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Extra actions shown left of "Done". */
  footer?: ReactNode;
  /** Called once the sheet is fully closed (navigate from here, not before). */
  onDismiss?: () => void;
};

/** Native iOS page sheet, dismissed by swiping down or "Done" (design-system BottomSheet). */
export function Sheet({ visible, title, onClose, children, footer, onDismiss }: SheetProps) {
  const { colors } = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onDismiss}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <AppText variant="title3" accessibilityRole="header" style={styles.title}>
            {title}
          </AppText>
          {footer}
          <Button title="Done" variant="ghost" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingTop: space[3],
    paddingBottom: space[2],
    paddingLeft: space[4],
    paddingRight: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1 },
  content: { padding: space[4], gap: space[4] },
});
