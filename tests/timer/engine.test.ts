import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSteps, withSetCount } from '../../src/features/timer/build-steps';
import { computeCues } from '../../src/features/timer/cues';
import {
  addRest,
  back,
  completeManual,
  currentStep,
  pause,
  remainingMs,
  replaceSteps,
  resume,
  skip,
  start,
  stop,
  tick,
} from '../../src/features/timer/machine';
import { applyTimerResults, buildPlannedRows } from '../../src/features/timer/rows';
import type { Cue, TimerDosage, TimerState } from '../../src/features/timer/types';

const settings = { prepCountdownS: 10, sideSwitchRestS: 10 };
const T0 = 1_000_000;

const repeaters: TimerDosage = {
  scheme: 'intervals',
  side: 'both',
  sets: 6,
  reps: 5,
  onS: 7,
  offS: 3,
  restBetweenSetsS: 180,
};
const maxHangs: TimerDosage = {
  scheme: 'isometric',
  side: 'both',
  sets: 3,
  durationS: 10,
  restBetweenSetsS: 180,
};
const phases = (dosage: TimerDosage) =>
  buildSteps(dosage, settings).map((s) => `${s.phase}${s.side ? `:${s.side[0]}` : ''}`);

/** Runs the timer second by second and collects the cues with their time offset. */
function run(state: TimerState, from: number, seconds: number) {
  const cues: [number, Cue][] = [];
  let prevNow = from;
  for (let now = from + 100; now <= from + seconds * 1000; now += 100) {
    const next = tick(state, now);
    for (const cue of computeCues(state, next, prevNow, now)) cues.push([(now - from) / 1000, cue]);
    state = next;
    prevNow = now;
  }
  return { state, cues };
}

describe('buildSteps', () => {
  it('builds the Repeaters example from docs/timer.md', () => {
    const steps = buildSteps(repeaters, settings);
    assert.equal(steps.length, 60);
    assert.deepEqual(steps[0], { phase: 'prep', durationS: 10, setIndex: 0, repIndex: null, side: null });
    assert.deepEqual(
      steps.slice(1, 11).map((s) => `${s.phase}${s.durationS}`),
      ['on7', 'off3', 'on7', 'off3', 'on7', 'off3', 'on7', 'off3', 'on7', 'rest180'],
    );
    assert.deepEqual(steps.at(-1), { phase: 'on', durationS: 7, setIndex: 6, repIndex: 5, side: null });
  });

  it('alternates left then right with a switch, then rests', () => {
    assert.deepEqual(phases({ ...maxHangs, side: 'alternate', sets: 2 }), [
      'prep',
      'on:l',
      'switch:r',
      'on:r',
      'rest',
      'on:l',
      'switch:r',
      'on:r',
    ]);
  });

  it('replaces the last off of each side for alternate intervals', () => {
    const dosage: TimerDosage = { ...repeaters, side: 'alternate', sets: 1, reps: 2 };
    assert.deepEqual(phases(dosage), ['prep', 'on:l', 'off:l', 'on:l', 'switch:r', 'on:r', 'off:r', 'on:r']);
  });

  it('uses manual effort steps for reps and circuits', () => {
    const steps = buildSteps(
      { scheme: 'reps', side: 'both', sets: 2, reps: 5, restBetweenSetsS: 120 },
      settings,
    );
    assert.deepEqual(
      steps.map((s) => [s.phase, s.durationS]),
      [
        ['prep', 10],
        ['on', null],
        ['rest', 120],
        ['on', null],
      ],
    );
  });

  it('chains slots without rest and runs a single step for a free duration', () => {
    assert.deepEqual(phases({ scheme: 'slots', side: null, sets: 3, slotDurationS: 180 }), [
      'prep',
      'on',
      'on',
      'on',
    ]);
    assert.deepEqual(phases({ scheme: 'free_duration', side: null, totalDurationS: 3600 }), ['prep', 'on']);
  });
});

describe('machine', () => {
  it('advances through steps on the wall clock', () => {
    let state = start(buildSteps(maxHangs, settings), T0);
    assert.equal(currentStep(state)?.phase, 'prep');
    assert.equal(remainingMs(state, T0 + 4000), 6000);

    state = tick(state, T0 + 10_000);
    assert.equal(currentStep(state)?.phase, 'on');
    state = tick(state, T0 + 20_000);
    assert.equal(currentStep(state)?.phase, 'rest');
    assert.deepEqual(state.results, [
      { setIndex: 1, repIndex: null, side: null, completed: true, elapsedS: 10 },
    ]);
  });

  it('catches up after a suspension without drifting', () => {
    // prep 10 + on 10 + rest 180 + on 10 = 210 s; at 205 s we are 5 s into set 2.
    const state = tick(start(buildSteps(maxHangs, settings), T0), T0 + 205_000);
    assert.equal(currentStep(state)?.setIndex, 2);
    assert.equal(state.stepStartedAt, T0 + 200_000);
    assert.equal(remainingMs(state, T0 + 205_000), 5000);
  });

  it('reaches done after the last step', () => {
    const state = tick(start(buildSteps(maxHangs, settings), T0), T0 + 3_600_000);
    assert.equal(state.status, 'done');
    assert.equal(state.results.length, 3);
  });

  it('freezes time while paused', () => {
    let state = start(buildSteps(maxHangs, settings), T0);
    state = pause(state, T0 + 4000);
    assert.equal(remainingMs(state, T0 + 60_000), 6000);
    assert.equal(tick(state, T0 + 60_000), state);
    state = resume(state, T0 + 60_000);
    assert.equal(remainingMs(state, T0 + 61_000), 5000);
  });

  it('marks a skipped effort as not completed', () => {
    let state = tick(start(buildSteps(maxHangs, settings), T0), T0 + 10_000);
    state = skip(state, T0 + 14_000);
    assert.equal(currentStep(state)?.phase, 'rest');
    assert.deepEqual(state.results, [
      { setIndex: 1, repIndex: null, side: null, completed: false, elapsedS: 4 },
    ]);
  });

  it('restarts the step on Back, or returns to the previous one when pressed early', () => {
    let state = tick(start(buildSteps(maxHangs, settings), T0), T0 + 20_000); // in rest
    const restarted = back(state, T0 + 50_000);
    assert.equal(currentStep(restarted)?.phase, 'rest');
    assert.equal(remainingMs(restarted, T0 + 50_000), 180_000);

    state = back(state, T0 + 21_000);
    assert.equal(currentStep(state)?.phase, 'on');
    assert.deepEqual(state.results, []);
  });

  it('extends a rest and ignores +30s elsewhere', () => {
    let state = start(buildSteps(maxHangs, settings), T0);
    assert.equal(addRest(state, 30), state);
    state = tick(state, T0 + 20_000);
    assert.equal(remainingMs(addRest(state, 30), T0 + 20_000), 210_000);
  });

  it('ends manual steps with a button, not the clock', () => {
    const dosage: TimerDosage = { scheme: 'reps', side: 'both', sets: 2, reps: 5, restBetweenSetsS: 60 };
    let state = tick(start(buildSteps(dosage, settings), T0), T0 + 999_000);
    assert.equal(currentStep(state)?.phase, 'on');
    assert.equal(state.stepStartedAt, T0 + 10_000);
    state = completeManual(state, T0 + 999_000);
    assert.equal(currentStep(state)?.phase, 'rest');
    assert.equal(state.results[0].completed, true);
  });

  it('records the effort in progress when stopped', () => {
    let state = tick(start(buildSteps(maxHangs, settings), T0), T0 + 10_000);
    state = stop(state, T0 + 16_000);
    assert.equal(state.status, 'stopped');
    assert.deepEqual(state.results[0], { setIndex: 1, repIndex: null, side: null, completed: false, elapsedS: 6 });
  });

  it('keeps its position when sets are added or removed', () => {
    let state = tick(start(buildSteps(maxHangs, settings), T0), T0 + 205_000); // set 2, on
    const more = replaceSteps(state, buildSteps(withSetCount(maxHangs, 4), settings), T0 + 205_000);
    assert.equal(currentStep(more)?.setIndex, 2);
    assert.equal(more.steps.length, state.steps.length + 2);

    // Resting after set 2 while set 3 is removed: nothing is left to do.
    state = tick(state, T0 + 215_000);
    assert.equal(currentStep(state)?.phase, 'rest');
    const fewer = replaceSteps(state, buildSteps(withSetCount(maxHangs, 2), settings), T0 + 215_000);
    assert.equal(fewer.status, 'done');
  });
});

describe('cues', () => {
  it('beeps 3-2-1, go and stop around a hang', () => {
    const { cues } = run(start(buildSteps(maxHangs, settings), T0), T0, 21);
    assert.deepEqual(cues, [
      [7, 'tick'],
      [8, 'tick'],
      [9, 'tick'],
      [10, 'go'],
      [20, 'stop'],
    ]);
  });

  it('warns 10 s before the end of a long rest and counts down to the next set', () => {
    const state = tick(start(buildSteps(maxHangs, settings), T0), T0 + 20_000);
    const { cues } = run(state, T0 + 20_000, 181);
    assert.deepEqual(cues, [
      [170, 'rest_end_warning'],
      [177, 'tick'],
      [178, 'tick'],
      [179, 'tick'],
      [180, 'go'],
    ]);
  });

  it('counts down inside a 3 s off without doubling the stop beep', () => {
    const state = tick(start(buildSteps(repeaters, settings), T0), T0 + 10_000);
    const { cues } = run(state, T0 + 10_000, 11);
    assert.deepEqual(cues, [
      [7, 'stop'],
      [8, 'tick'],
      [9, 'tick'],
      [10, 'go'],
    ]);
  });

  it('plays the final sound once and stays silent when catching up or resuming', () => {
    const state = start(buildSteps({ ...maxHangs, sets: 1 }, settings), T0);
    const { cues } = run(state, T0, 21);
    assert.deepEqual(cues.at(-1), [20, 'exercise_done']);

    const late = tick(state, T0 + 15_000);
    assert.deepEqual(computeCues(state, late, T0, T0 + 15_000), []);

    const paused = pause(late, T0 + 16_000);
    const resumed = resume(paused, T0 + 30_000);
    assert.deepEqual(computeCues(paused, resumed, T0 + 29_900, T0 + 30_000), []);
  });
});

describe('cues on manual navigation', () => {
  const pulls: TimerDosage = { scheme: 'reps', side: 'both', sets: 3, reps: 5, restBetweenSetsS: 120 };
  /** Mirrors the store: bring the timer up to date, apply the action, compute cues. */
  const act = (state: TimerState, now: number, action: typeof skip) => {
    const next = action(tick(state, now), now);
    return { next, cues: computeCues(state, next, now, now) };
  };

  it('plays "go" every time Next or the check leads into an effort', () => {
    let state = tick(start(buildSteps(pulls, settings), T0), T0 + 10_000); // set 1, manual
    let now = T0 + 10_000;
    for (let set = 1; set < 3; set++) {
      now += 20_000;
      const done = act(state, now, completeManual);
      assert.equal(currentStep(done.next)?.phase, 'rest');
      assert.deepEqual(done.cues, []);

      now += 5_000;
      const skipped = act(done.next, now, skip);
      assert.equal(currentStep(skipped.next)?.setIndex, set + 1);
      assert.deepEqual(skipped.cues, ['go']);
      state = skipped.next;
    }
  });

  it('plays "go" when a rest is skipped during its 3-2-1 countdown', () => {
    const state = tick(start(buildSteps(maxHangs, settings), T0), T0 + 198_500); // 1.5 s of rest left
    const { next, cues } = act(state, T0 + 198_600, skip);
    assert.equal(currentStep(next)?.phase, 'on');
    assert.deepEqual(cues, ['go']);
  });

  it('plays "go" when skipping straight from one effort to the next', () => {
    const slots: TimerDosage = { scheme: 'slots', side: null, sets: 3, slotDurationS: 180 };
    const state = tick(start(buildSteps(slots, settings), T0), T0 + 10_000);
    assert.deepEqual(act(state, T0 + 30_000, skip).cues, ['go']);
  });
});

describe('log rows', () => {
  it('fills rows from a Repeaters stopped during rep 3 of set 4', () => {
    // prep 10 + 3 sets of (5×7 + 4×3 + 180 = 227) = 691 s, then on, off, on, off, 3 s into rep 3.
    const stoppedAt = T0 + (691 + 7 + 3 + 7 + 3 + 3) * 1000;
    let state = tick(start(buildSteps(repeaters, settings), T0), stoppedAt);
    assert.deepEqual([currentStep(state)?.setIndex, currentStep(state)?.repIndex], [4, 3]);
    state = stop(state, stoppedAt);

    const rows = applyTimerResults(buildPlannedRows(repeaters, 5), repeaters, state.results, true);
    assert.deepEqual(
      rows.map((row) => [row.setIndex, row.reps, row.result, row.loadKg]),
      [
        [1, 5, 'success', 5],
        [2, 5, 'success', 5],
        [3, 5, 'success', 5],
        [4, 2, 'fail', 5],
      ],
    );
  });

  it('keeps hand-edited values and upcoming sets while the timer runs', () => {
    const state = tick(start(buildSteps(maxHangs, settings), T0), T0 + 20_000);
    const planned = buildPlannedRows(maxHangs, null).map((row) =>
      row.setIndex === 1 ? { ...row, durationS: 8, edited: true } : row,
    );
    const rows = applyTimerResults(planned, maxHangs, state.results, false);
    assert.deepEqual(
      rows.map((row) => [row.durationS, row.done]),
      [
        [8, true],
        [10, false],
        [10, false],
      ],
    );
  });

  it('creates paired rows for alternate sides and one row per climb in a circuit', () => {
    assert.deepEqual(
      buildPlannedRows({ ...maxHangs, side: 'alternate', sets: 1 }, null).map((row) => row.side),
      ['left', 'right'],
    );
    const circuit: TimerDosage = { scheme: 'circuit', side: null, rounds: 4, itemsPerRound: 4 };
    assert.equal(buildPlannedRows(circuit, null).length, 16);
  });
});
