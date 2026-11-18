import { CircleCheck, Info } from 'lucide-react-native';
import { useEffect, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { radius, space, useTheme } from '@/theme';

type Toast = { id: number; text: string; variant: 'info' | 'success' };

const DURATION_MS = 3000;
// Clears the tab bar and the session bar above it.
const BOTTOM_OFFSET = 120;

let current: Toast | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Shows a short message at the bottom of the screen (docs/screens.md §3.4). */
export function showToast(text: string, variant: Toast['variant'] = 'success'): void {
  current = { id: nextId++, text, variant };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Mounted once, above the navigator. */
export function ToastHost() {
  const toast = useSyncExternalStore(subscribe, () => current);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => {
      if (current?.id === toast.id) {
        current = null;
        emit();
      }
    }, DURATION_MS);
    return () => clearTimeout(id);
  }, [toast]);

  if (!toast) return null;
  const Icon = toast.variant === 'success' ? CircleCheck : Info;

  return (
    <View pointerEvents="none" style={[styles.host, { bottom: insets.bottom + BOTTOM_OFFSET }]}>
      <Animated.View
        key={toast.id}
        entering={FadeInDown}
        exiting={FadeOutDown}
        accessibilityLiveRegion="polite"
        style={[styles.toast, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <Icon
          size={20}
          strokeWidth={1.75}
          color={toast.variant === 'success' ? colors.success : colors.info}
        />
        <AppText variant="bodyStrong" style={styles.text}>
          {toast.text}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: space[4], right: space[4], alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
  },
  text: { flexShrink: 1 },
});
