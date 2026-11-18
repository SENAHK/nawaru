import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { AppText } from '@/components/app-text';
import { diffDays } from '@/lib/dates';
import { formatShortDate } from '@/lib/format';
import { radius, space, useTheme } from '@/theme';

import type { Point } from './stats';

const HEIGHT = 180;
const PAD = { top: space[3], right: space[3], bottom: space[6], left: space[10] };
const MARKER = 4;
const DIAMOND = 6;

type LineChartProps = {
  points: Point[];
  /** Test references, drawn as diamonds. */
  references: Point[];
  /** Value shown in the tooltip. */
  format: (kg: number) => string;
  /** Compact value for the axis, without the unit ("+26", "130%"). */
  axisFormat: (kg: number) => string;
};

/**
 * One series over time (best set per day) with references as diamonds.
 * Tap or drag to read a day; the reading stays until the next touch (docs/screens.md S12; dataviz: thin 2 pt
 * line, 8 pt markers, recessive grid, tooltip on touch).
 */
export function LineChart({ points, references, format, axisFormat }: LineChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const all = [...points, ...references];
  const dates = all.map((point) => point.date).sort();
  const first = dates[0];
  const span = Math.max(1, diffDays(first, dates.at(-1)!));
  const values = all.map((point) => point.kg);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = Math.max(1, (rawMax - rawMin) * 0.15);
  const min = Math.floor(rawMin - pad);
  const max = Math.ceil(rawMax + pad);

  const plotWidth = Math.max(1, width - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (date: string) =>
    PAD.left + (all.length === 1 ? plotWidth / 2 : (diffDays(first, date) / span) * plotWidth);
  const y = (kg: number) => PAD.top + (1 - (kg - min) / (max - min)) * plotHeight;

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.date).toFixed(1)},${y(point.kg).toFixed(1)}`)
    .join(' ');
  const ticks = [max, (max + min) / 2, min];

  // The tooltip follows the nearest day under the finger.
  const pick = (event: GestureResponderEvent) => {
    if (points.length === 0) return;
    const touchX = event.nativeEvent.locationX;
    let nearest = 0;
    points.forEach((point, index) => {
      if (Math.abs(x(point.date) - touchX) < Math.abs(x(points[nearest].date) - touchX)) nearest = index;
    });
    setSelected(nearest);
  };

  const active = selected != null ? points[selected] : null;
  const activeReference = active ? references.find((ref) => ref.date === active.date) : null;
  const summary = points.map((point) => `${formatShortDate(point.date)}: ${format(point.kg)}`).join(', ');

  return (
    <View style={styles.root}>
      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Best set per day. ${summary}`}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
        style={styles.plot}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {ticks.map((tick) => (
              <Line
                key={tick}
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke={colors.border}
                strokeWidth={StyleSheet.hairlineWidth}
              />
            ))}
            {active ? (
              <Line
                x1={x(active.date)}
                x2={x(active.date)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                stroke={colors.borderStrong}
                strokeWidth={1}
              />
            ) : null}
            {points.length > 1 ? (
              <Path d={path} stroke={colors.accent} strokeWidth={2} fill="none" strokeLinejoin="round" />
            ) : null}
            {points.map((point, index) => (
              <Circle
                key={point.date}
                cx={x(point.date)}
                cy={y(point.kg)}
                r={index === selected ? MARKER + 2 : MARKER}
                fill={colors.accent}
                stroke={colors.surface}
                strokeWidth={2}
              />
            ))}
            {references.map((ref) => (
              <Rect
                key={`ref:${ref.date}:${ref.kg}`}
                x={x(ref.date) - DIAMOND / 2}
                y={y(ref.kg) - DIAMOND / 2}
                width={DIAMOND}
                height={DIAMOND}
                fill={colors.textPrimary}
                stroke={colors.surface}
                strokeWidth={2}
                rotation={45}
                origin={`${x(ref.date)}, ${y(ref.kg)}`}
              />
            ))}
          </Svg>
        ) : null}

        {width > 0
          ? ticks.map((tick) => (
              <AppText
                key={tick}
                variant="caption"
                color="textTertiary"
                style={[styles.yLabel, { top: y(tick) - space[2] }]}>
                {axisFormat(tick)}
              </AppText>
            ))
          : null}
        <View style={styles.xLabels} pointerEvents="none">
          <AppText variant="caption" color="textTertiary">
            {formatShortDate(first)}
          </AppText>
          {dates.length > 1 ? (
            <AppText variant="caption" color="textTertiary">
              {formatShortDate(dates.at(-1)!)}
            </AppText>
          ) : null}
        </View>

        {active ? (
          <View
            pointerEvents="none"
            style={[
              styles.tooltip,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
              x(active.date) > width / 2 ? { right: width - x(active.date) + space[2] } : { left: x(active.date) + space[2] },
            ]}>
            <AppText variant="caption" color="textSecondary">
              {formatShortDate(active.date)}
            </AppText>
            <AppText variant="bodyStrong">{format(active.kg)}</AppText>
            {activeReference ? (
              <AppText variant="caption" color="textSecondary">
                Reference {format(activeReference.kg)}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <AppText variant="caption" color="textSecondary">
            Best set per day
          </AppText>
        </View>
        {references.length > 0 ? (
          <View style={styles.legendItem}>
            <View style={[styles.legendDiamond, { backgroundColor: colors.textPrimary }]} />
            <AppText variant="caption" color="textSecondary">
              Test reference
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[2] },
  plot: { height: HEIGHT },
  yLabel: { position: 'absolute', left: 0, width: PAD.left - space[2], textAlign: 'right' },
  xLabels: {
    position: 'absolute',
    left: PAD.left,
    right: PAD.right,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    paddingVertical: space[1],
    paddingHorizontal: space[2],
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  legend: { flexDirection: 'row', gap: space[4] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  legendDot: { width: space[2], height: space[2], borderRadius: radius.full },
  legendDiamond: { width: 7, height: 7, transform: [{ rotate: '45deg' }] },
});
