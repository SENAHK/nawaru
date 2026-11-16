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

/** Creates one player per sound. `volume` is 0–100. */
export function loadSounds(volume: number): void {
  if (!players) {
    // Background playback needs a development build; in Expo Go sounds play
    // in the foreground only.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(
      () => {},
    );
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

export function unloadSounds(): void {
  if (!players) return;
  for (const player of Object.values(players)) player.remove();
  players = null;
}
