import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { formatAddedLoad, formatCountdown, formatDuration } from '@/lib/format';
import { motion, radius, space, timerPhases, touch, typography, useTheme } from '@/theme';

import { setCount } from './build-steps';
import { currentStep, nextStep, progress, remainingMs } from './machine';
import { dispatch, toggleSounds, type Session } from './store';
import type { Step, TimerState } from './types';

const REFRESH_MS = 100;

/** Re-renders on a short interval while the timer is running. */
export function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), REFRESH_MS);
    return () => clearInterval(id);
  }, [running]);
  return now;
}

export function phaseLabel(step: Step | null, usesHangboard: boolean): string {
  switch (step?.phase) {
    case 'prep':
      return 'GET READY';
    case 'on':
      return usesHangboard ? 'HANG' : 'GO';
    case 'off':
      return 'OFF';
    case 'rest':
      return 'REST';
    case 'switch':
      return 'SWITCH';
    default:
      return 'DONE';
  }
}

function upNext(timer: TimerState, usesHangboard: boolean): string {
  const step = currentStep(timer);
  const next = nextStep(timer);
  if (!step) return '';
  if (!next) return 'Up next: Done';
  const duration = next.durationS == null ? '' : ` ${formatDuration(next.durationS)}`;
  switch (next.phase) {
    case 'on': {
      const set = next.setIndex !== step.setIndex ? `Set ${next.setIndex} · ` : '';
      return `Up next: ${set}${phaseLabel(next, usesHangboard)}${duration}`;
    }
    case 'switch':
      return `Up next: Switch to ${next.side === 'left' ? 'LEFT' : 'RIGHT'}`;
    case 'rest':
      return `Up next: Rest${duration}`;
    default:
      return `Up next: ${phaseLabel(next, usesHangboard)}${duration}`;
  }
}

type TimerPanelProps = {
  session: Session;
  timer: TimerState;
  focus: boolean;
  onToggleFocus: () => void;
  onClose: () => void;
};

export function TimerPanel({ session, timer, focus, onToggleFocus, onClose }: TimerPanelProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const running = timer.status === 'running';
  const paused = timer.status === 'paused';
  // The refresh clock can lag one frame behind a transition.
  const now = Math.max(useNow(running), timer.stepStartedAt);

  const step = currentStep(timer);
  const phase = step?.phase ?? 'done';
  const palette = timerPhases[phase];
  const remaining = remainingMs(timer, now);
  const manual = step != null && step.durationS == null;
  const active = running || paused;
  // A manual step has no clock: it shows what to do, and a check ends it.
  const manualTarget =
    session.dosage.scheme === 'circuit'
      ? { count: session.dosage.itemsPerRound ?? 0, unit: 'CLIMBS' }
      : { count: session.dosage.reps ?? 0, unit: 'REPS' };
  const ratio = progress(timer, now);
  const total = setCount(session.dosage);
  const { soundsEnabled } = session.settings;

  const context = [
    step && step.setIndex > 0 ? `Set ${step.setIndex}/${total}` : null,
    step?.repIndex != null && session.dosage.reps ? `Rep ${step.repIndex}/${session.dosage.reps}` : null,
    session.targetLoadKg != null ? formatAddedLoad(session.targetLoadKg) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const countdownStyle = focus ? typography.timer : typography.timerCompact;
  const SideArrow = step?.side === 'left' ? ArrowLeft : ArrowRight;

  return (
    <Animated.View
      style={[
        styles.root,
        focus && styles.focus,
        {
          paddingTop: insets.top,
          backgroundColor: palette.bg,
          transitionProperty: 'backgroundColor',
          transitionDuration: motion.slow,
        },
      ]}>
      {paused ? <View pointerEvents="none" style={styles.pausedOverlay} /> : null}

      <View style={styles.topBar}>
        <PanelButton icon={ChevronDown} label="Close" color={palette.fg} onPress={onClose} />
        <AppText variant={focus ? 'displayL' : 'title2'} style={{ color: palette.fg }}>
          {paused ? 'PAUSED' : phaseLabel(step, session.usesHangboard)}
        </AppText>
        <PanelButton
          icon={soundsEnabled ? Volume2 : VolumeX}
          label={soundsEnabled ? 'Mute sounds' : 'Unmute sounds'}
          color={palette.fg}
          onPress={toggleSounds}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={focus ? 'Show the log' : 'Enlarge the timer'}
        onPress={onToggleFocus}
        style={[styles.countdown, focus && styles.countdownFocus]}>
        {step?.side ? (
          <View style={styles.side}>
            <SideArrow size={focus ? 48 : 32} strokeWidth={2.5} color={palette.fg} />
            <AppText variant={focus ? 'displayL' : 'displayM'} style={{ color: palette.fg }}>
              {step.side === 'left' ? 'LEFT' : 'RIGHT'}
            </AppText>
          </View>
        ) : null}
        <AppText
          maxFontSizeMultiplier={1}
          style={[countdownStyle, styles.digits, { color: palette.fg }]}>
          {phase === 'done' ? '✓' : manual ? manualTarget.count : formatCountdown(remaining ?? 0)}
        </AppText>
        {manual ? (
          <AppText variant={focus ? 'displayL' : 'title2'} style={{ color: palette.fg }}>
            {manualTarget.unit}
          </AppText>
        ) : null}
        {focus && context ? (
          <AppText variant="title2" style={{ color: palette.fg }}>
            {context}
          </AppText>
        ) : null}
      </Pressable>

      {active ? (
        <View style={styles.controls}>
          <PanelButton icon={SkipBack} label="Previous step" color={palette.fg} onPress={() => dispatch('back')} />
          {manual && !paused ? (
            <PanelButton
              icon={Check}
              label={session.dosage.scheme === 'circuit' ? 'Round done' : 'Set done'}
              color={palette.fg}
              large
              onPress={() => dispatch('completeManual')}
            />
          ) : (
            <PanelButton
              icon={paused ? Play : Pause}
              label={paused ? 'Resume' : 'Pause'}
              color={palette.fg}
              large
              onPress={() => dispatch(paused ? 'resume' : 'pause')}
            />
          )}
          <PanelButton icon={SkipForward} label="Next step" color={palette.fg} onPress={() => dispatch('skip')} />
          {phase === 'rest' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add 30 seconds of rest"
              onPress={() => dispatch('addRest')}
              style={({ pressed }) => [
                styles.textButton,
                styles.addRest,
                { borderColor: palette.fg, opacity: pressed ? 0.6 : 1 },
              ]}>
              <AppText variant="bodyStrong" style={{ color: palette.fg }}>
                +30s
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.progressTrack}>
        {ratio != null ? (
          <View style={[styles.progressFill, { width: `${ratio * 100}%`, backgroundColor: palette.fg }]} />
        ) : null}
      </View>

      <View style={[styles.upNext, { backgroundColor: colors.surfaceRaised }]}>
        <AppText variant="bodySm" color="textSecondary">
          {active ? upNext(timer, session.usesHangboard) : 'Check your sets, then save'}
        </AppText>
      </View>
    </Animated.View>
  );
}

function PanelButton({
  icon: Icon,
  label,
  color,
  large,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  large?: boolean;
  onPress: () => void;
}) {
  const size = large ? touch.timer : touch.min;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.panelButton,
        { width: size, height: size, opacity: pressed ? 0.6 : 1 },
      ]}>
      <Icon size={large ? 36 : 24} strokeWidth={1.75} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  focus: { flex: 1 },
  pausedOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[2],
  },
  countdown: { alignItems: 'center', paddingVertical: space[2], gap: space[1] },
  countdownFocus: { flex: 1, justifyContent: 'center', gap: space[4] },
  side: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  digits: { fontVariant: ['tabular-nums'] },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[8],
    paddingBottom: space[4],
  },
  panelButton: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  textButton: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  addRest: { position: 'absolute', right: space[4], bottom: space[4] + space[2] },
  progressTrack: { height: 3 },
  progressFill: { height: 3, opacity: 0.4 },
  upNext: { alignItems: 'center', paddingVertical: space[2] },
});
