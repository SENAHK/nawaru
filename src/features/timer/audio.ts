import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import type { Cue } from './types';

// Placeholder synthesised beeps; to be replaced by mixed sounds later.
const sources: Record<Cue, number> = {
  tick: require('@/assets/sounds/tick.wav'),
  go: require('@/assets/sounds/go.wav'),
  stop: require('@/assets/sounds/stop.wav'),
  switch: require('@/assets/sounds/switch.wav'),
  rest_end_warning: require('@/assets/sounds/rest_end_warning.wav'),
  exercise_done: require('@/assets/sounds/exercise_done.wav'),
};

let players: Record<Cue, AudioPlayer> | null = null;
let silence: AudioPlayer | null = null;

/** Creates one player per sound. `volume` is 0–100. */
export function loadSounds(volume: number): void {
  if (!players) {
    // Background playback needs a development build (the `audio` background
    // mode); in Expo Go, sounds play in the foreground only. Mixing keeps the
    // athlete's music playing under the beeps (docs/timer.md §4.2).
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
    players = Object.fromEntries(
      (Object.keys(sources) as Cue[]).map((cue) => [cue, createAudioPlayer(sources[cue])]),
    ) as Record<Cue, AudioPlayer>;
  }
  for (const player of Object.values(players)) player.volume = volume / 100;
}

export function playCue(cue: Cue): void {
  const player = players?.[cue];
  if (!player) return;
  // A sound that has already played sits at its end: rewinding is async, and
  // calling play() before the seek lands can leave the player silent.
  if (player.playing || player.currentTime > 0) {
    const replay = () => player.play();
    player.seekTo(0).then(replay, replay);
  } else {
    player.play();
  }
}

/**
 * Keeps the app awake with the screen locked: iOS suspends the JS loop a few
 * seconds after going to the background unless audio is playing, so a silent
 * file loops while the timer runs (docs/timer.md §4.3). Safe to call on every
 * tick: it restarts the loop if iOS stopped it (headphones unplugged, call).
 */
export function keepAwakeWithSilence(): void {
  if (!silence) {
    silence = createAudioPlayer(require('@/assets/sounds/silence.wav'));
    silence.loop = true;
  }
  if (!silence.playing) silence.play();
}

export function stopSilence(): void {
  if (!silence) return;
  silence.remove();
  silence = null;
}

export function unloadSounds(): void {
  stopSilence();
  if (!players) return;
  for (const player of Object.values(players)) player.remove();
  players = null;
}
