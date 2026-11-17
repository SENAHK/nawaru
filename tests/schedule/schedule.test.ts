import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  programWeekOf,
  resolveLoad,
  scheduledDate,
  sessionStatus,
} from '../../src/features/schedule/schedule';
import { addDays, isoWeekday, mondayOf } from '../../src/lib/dates';

describe('dates', () => {
  it('finds weekdays and Mondays', () => {
    assert.equal(isoWeekday('2026-11-16'), 1);
    assert.equal(isoWeekday('2026-11-22'), 7);
    assert.equal(mondayOf('2026-11-17'), '2026-11-16');
    assert.equal(mondayOf('2026-11-22'), '2026-11-16');
    assert.equal(mondayOf('2026-11-16'), '2026-11-16');
  });

  it('adds days across months and DST changes', () => {
    assert.equal(addDays('2026-11-30', 1), '2026-12-01');
    assert.equal(addDays('2026-03-28', 2), '2026-03-30');
    assert.equal(addDays('2026-10-24', 2), '2026-10-26');
  });
});

describe('schedule', () => {
  it('places sessions from the start Monday', () => {
    assert.equal(scheduledDate('2026-11-16', 1, 1), '2026-11-16');
    assert.equal(scheduledDate('2026-11-16', 1, 4), '2026-11-19');
    assert.equal(scheduledDate('2026-11-16', 3, 2), '2026-12-01');
  });

  it('computes the program week of a date', () => {
    assert.equal(programWeekOf('2026-11-16', '2026-11-16'), 1);
    assert.equal(programWeekOf('2026-11-16', '2026-11-22'), 1);
    assert.equal(programWeekOf('2026-11-16', '2026-11-23'), 2);
    assert.equal(programWeekOf('2026-11-16', '2026-11-15'), 0);
  });

  it('derives the session status', () => {
    const today = '2026-11-17';
    assert.equal(sessionStatus('2026-11-17', today, null), 'planned');
    assert.equal(sessionStatus('2026-11-19', today, null), 'planned');
    assert.equal(sessionStatus('2026-11-16', today, null), 'missed');
    const started = { startedAt: 1, endedAt: null, loggedExercises: 2 };
    assert.equal(sessionStatus('2026-11-16', today, started), 'in_progress');
    assert.equal(sessionStatus('2026-11-16', today, { ...started, endedAt: 2 }), 'done');
    // Logged without pressing "Start session".
    assert.equal(sessionStatus('2026-11-16', today, { startedAt: null, endedAt: null, loggedExercises: 1 }), 'done');
    assert.equal(sessionStatus('2026-11-16', today, { startedAt: null, endedAt: null, loggedExercises: 0 }), 'missed');
  });
});

describe('resolveLoad', () => {
  it('formats each load mode', () => {
    assert.deepEqual(resolveLoad('absolute', 40, null, null), { kg: 40, label: '40 kg' });
    assert.deepEqual(resolveLoad('added', 5, null, null), { kg: 5, label: '+5 kg' });
    assert.deepEqual(resolveLoad('assisted', 10, null, null), { kg: -10, label: '−10 kg' });
  });

  it('resolves a percentage of the reference, rounded to 0.5 kg', () => {
    assert.deepEqual(resolveLoad('percent_reference', 80, 24, null), { kg: 19, label: '+19 kg (80% ref)' });
    assert.deepEqual(resolveLoad('percent_reference', 85, 23, null), { kg: 19.5, label: '+19.5 kg (85% ref)' });
    assert.deepEqual(resolveLoad('percent_reference', 80, null, 12), { kg: null, label: '80% ref · no test yet' });
  });

  it('falls back to the last logged load when nothing is prescribed', () => {
    assert.deepEqual(resolveLoad('none', null, null, 5), { kg: 5, label: '+5 kg · last' });
    assert.deepEqual(resolveLoad('none', null, null, null), { kg: null, label: '' });
  });
});
