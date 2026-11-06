/**
 * Unit tests for impact.js (personal impact). No emulator needed:
 *   npm run test:functions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { completionEventId, computeImpact, impactIncrement, impactSnapshot, monthKey, reportedValue } = require('./impact');

const tap = { impact: { measure: 'water', perUnit: 6, inputDefault: 2, inputMax: 30, inputLabel: 'Minutes', inputUnit: 'min', assumption: 'x', status: 'draft' } };
const inc = (n) => ({ inc: n });
const FieldValue = { increment: inc };

describe('impact', () => {
  it('a completion stores the recipe\'s rate and cap at the default amount', () => {
    assert.deepEqual(impactSnapshot(tap), { measure: 'water', perUnit: 6, inputMax: 30, amount: 2, value: 12 });
    assert.equal(impactSnapshot({ impact: null }), null);
    assert.equal(impactSnapshot({ impact: { ...tap.impact, perUnit: 0 } }), null);
    assert.equal(impactSnapshot({ impact: { ...tap.impact, measure: 'gold' } }), null);
  });

  it('a reported amount is worked out on the server and capped', () => {
    const snap = impactSnapshot(tap);
    assert.equal(reportedValue(snap, 5), 30);
    assert.equal(reportedValue(snap, 1000), 180);
    assert.equal(reportedValue(snap, -4), 0);
    assert.equal(reportedValue(snap, 'lots'), 0);
  });

  it('months are India time', () => {
    assert.equal(monthKey(new Date('2026-10-31T19:00:00Z')), '2026-11'); // 00:30 IST on 1 Nov
    assert.equal(monthKey(new Date('2026-10-31T18:00:00Z')), '2026-10');
  });

  it('adds to the all-time and monthly totals as nested maps', () => {
    assert.deepEqual(impactIncrement('water', 12, '2026-11', FieldValue), {
      impactTotals: { water: inc(12) },
      impactByMonth: { '2026-11': { water: inc(12) } }
    });
    assert.equal(impactIncrement('water', 0, '2026-11', FieldValue), null);
    assert.equal(impactIncrement('gold', 5, '2026-11', FieldValue), null);
  });

  it('the recompute uses each completion\'s snapshot, a reported amount instead of the default, and the current recipe for old completions', async () => {
    const snap = impactSnapshot(tap);
    const completions = [
      { id: 'u_action_completed_tap_1', data: { contentId: 'tap', impact: snap, timestamp: new Date('2026-11-02T10:00:00Z') } },
      { id: 'u_action_completed_tap_2', data: { contentId: 'tap', impact: snap, timestamp: new Date('2026-11-03T10:00:00Z') } },
      { id: 'u_action_completed_old_1', data: { contentId: 'old', timestamp: new Date('2026-10-20T10:00:00Z') } },
      { id: 'u_action_completed_calm_1', data: { contentId: 'calm', timestamp: new Date('2026-11-03T10:00:00Z') } }
    ];
    const reported = new Map([['u_action_completed_tap_2', 5]]);
    const snapshotFor = async (id) => (id === 'old' ? impactSnapshot(tap) : null);
    assert.deepEqual(await computeImpact(completions, reported, snapshotFor), {
      impactTotals: { water: 12 + 30 + 12 },
      impactByMonth: { '2026-11': { water: 42 }, '2026-10': { water: 12 } }
    });
  });

  it('an impact_reported event points at its own completion', () => {
    assert.equal(completionEventId({ userId: 'u1', contentId: 'tap', completionNumber: 3 }), 'u1_action_completed_tap_3');
  });
});
