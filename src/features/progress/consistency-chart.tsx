import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { formatShortDate } from '@/lib/format';
import { radius, space, useTheme } from '@/theme';

import type { WeekConsistency } from './stats';

const HEIGHT = 120;

/**
 * Weekly bars: the planned sessions as a track, the done ones filled.
 * Tap a week to read it; the current week is labelled.
 */
export function ConsistencyChart({ weeks }: { weeks: WeekConsistency[] }) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState(weeks.length - 1);
  const top = Math.max(1, ...weeks.map((week) => week.planned), ...weeks.map((week) => week.done));
  const active = weeks[selected];

  return (
    <View style={styles.root}>
      <AppText variant="bodySm" color="textSecondary">
        Week of {formatShortDate(active.monday)}:{' '}
        <AppText variant="bodyStrong">
          {active.done} / {active.planned}
        </AppText>{' '}
        sessions
      </AppText>
      <View style={styles.bars}>
        {weeks.map((week, index) => (
          <Pressable
            key={week.monday}
            accessibilityRole="button"
            accessibilityLabel={`Week of ${formatShortDate(week.monday)}: ${week.done} of ${week.planned} sessions`}
            accessibilityState={{ selected: index === selected }}
            onPress={() => setSelected(index)}
            style={styles.column}>
            <View
              style={[
                styles.track,
                {
                  height: (week.planned / top) * HEIGHT,
                  borderColor: index === selected ? colors.borderStrong : colors.border,
                },
              ]}>
              <View
                style={[
                  styles.fill,
                  {
                    height: `${week.planned > 0 ? Math.min(100, (week.done / week.planned) * 100) : 0}%`,
                    backgroundColor: colors.accent,
                  },
                ]}
              />
            </View>
          </Pressable>
        ))}
      </View>
      <View style={styles.axis}>
        <AppText variant="caption" color="textTertiary">
          {formatShortDate(weeks[0].monday)}
        </AppText>
        <AppText variant="caption" color="textTertiary">
          This week
        </AppText>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.accent }]} />
          <AppText variant="caption" color="textSecondary">
            Done
          </AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, styles.swatchTrack, { borderColor: colors.borderStrong }]} />
          <AppText variant="caption" color="textSecondary">
            Planned
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[2] },
  bars: { height: HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: space[2] },
  column: { flex: 1, height: HEIGHT, justifyContent: 'flex-end' },
  track: {
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  fill: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', gap: space[4] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  swatch: { width: space[3], height: space[3], borderRadius: 3 },
  swatchTrack: { borderWidth: 1 },
});
