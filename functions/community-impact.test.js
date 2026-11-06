/**
 * Unit tests for community-impact.js. No emulator needed:
 *   npm run test:functions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { MIN_MEMBERS, computeCommunityImpact } = require('./community-impact');

describe('community impact', () => {
  const metrics = [
    { id: 'a', impactByMonth: { '2026-11': { water: 30, co2: 0.5 }, '2026-10': { water: 100 } } },
    { id: 'b', impactByMonth: { '2026-11': { water: 12, plastic: 2 } } },
    { id: 'c', impactByMonth: { '2026-10': { water: 6 } } },
    { id: 'd', impactByMonth: { '2026-11': { water: 0 } } },
    { id: 'team', impactByMonth: { '2026-11': { water: 9999 } } },
    { id: 'e' }
  ];

  it('adds up the month over members who saved something, leaving out the team', () => {
    assert.deepEqual(computeCommunityImpact(metrics, new Set(['team']), '2026-11'), {
      month: '2026-11', totals: { water: 42, co2: 0.5, plastic: 2 }, members: 2, minMembers: MIN_MEMBERS
    });
  });

  it('only counts that month', () => {
    assert.deepEqual(computeCommunityImpact(metrics, new Set(['team']), '2026-10').totals, { water: 106 });
  });

  it('shows numbers only from 20 members', () => {
    assert.equal(MIN_MEMBERS, 20);
  });
});
