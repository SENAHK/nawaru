import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bestPerDay,
  comboKey,
  formatCombo,
  percentOfBodyweight,
  personalRecordId,
  summarize,
  weeklyConsistency,
} from '../../src/features/progress/stats';

describe('progress stats', () => {
  it('keeps the heaviest set of each day, oldest first', () => {
    assert.deepEqual(
      bestPerDay([
        { date: '2026-11-10', kg: 20 },
        { date: '2026-11-03', kg: 18 },
        { date: '2026-11-10', kg: 24 },
        { date: '2026-11-10', kg: 22 },
      ]),
      [
        { date: '2026-11-03', kg: 18 },
        { date: '2026-11-10', kg: 24 },
      ],
    );
  });

  it('finds the best and the change over the last 8 weeks', () => {
    const points = [
      { date: '2026-08-01', kg: 30 },
      { date: '2026-10-01', kg: 20 },
      { date: '2026-11-01', kg: 22 },
      { date: '2026-11-15', kg: 24.5 },
    ];
    assert.deepEqual(summarize(points, '2026-11-18'), { best: { date: '2026-08-01', kg: 30 }, change: 4.5 });
    assert.equal(summarize(points.slice(-1), '2026-11-18').change, null);
    assert.deepEqual(summarize([], '2026-11-18'), { best: null, change: null });
  });

  it('expresses a hang as a % of bodyweight', () => {
    assert.equal(percentOfBodyweight(21, 70), 130);
    assert.equal(percentOfBodyweight(-10, 70), 86);
  });

  it('counts sessions done and planned for each of the last weeks', () => {
    const weeks = weeklyConsistency(
      [
        { scheduledDate: '2026-11-16', status: 'done' },
        { scheduledDate: '2026-11-19', status: 'planned' },
        { scheduledDate: '2026-11-09', status: 'missed' },
        { scheduledDate: '2026-11-12', status: 'done' },
        { scheduledDate: '2026-09-01', status: 'done' },
      ],
      '2026-11-18',
      3,
    );
    assert.deepEqual(weeks, [
      { monday: '2026-11-02', done: 0, planned: 0 },
      { monday: '2026-11-09', done: 1, planned: 2 },
      { monday: '2026-11-16', done: 1, planned: 2 },
    ]);
  });

  it('flags the first time the heaviest load was reached', () => {
    assert.equal(
      personalRecordId([
        { id: 'c', date: '2026-11-10', bestKg: 25 },
        { id: 'b', date: '2026-11-03', bestKg: 25 },
        { id: 'a', date: '2026-10-27', bestKg: 22 },
        { id: 'd', date: '2026-11-12', bestKg: null },
      ]),
      'b',
    );
    assert.equal(personalRecordId([{ id: 'x', date: '2026-11-01', bestKg: null }]), null);
  });

  it('names and keys a grip combination', () => {
    const combo = { gripType: 'half_crimp' as const, fingerCount: 'four' as const, edgeMm: 20, durationS: 10 };
    assert.equal(formatCombo(combo), '20 mm · 4F HC · 10s');
    assert.equal(comboKey(combo), 'half_crimp|four|20|10');
    assert.equal(formatCombo({ gripType: null, fingerCount: null, edgeMm: null, durationS: null }), 'Any grip');
  });
});
