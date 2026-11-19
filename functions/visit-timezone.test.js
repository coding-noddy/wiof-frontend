/**
 * Unit tests for visit-timezone.js (streak hardening, Passport v1).
 *   npm run test:functions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validTimezone, visitTimezones } = require('./visit-timezone');

describe('visit time zones', () => {
  it('accepts real IANA zones only', () => {
    assert.equal(validTimezone('Asia/Kolkata'), 'Asia/Kolkata');
    assert.equal(validTimezone('Mars/Olympus'), null);
    assert.equal(validTimezone(''), null);
    assert.equal(validTimezone(42), null);
  });

  it('counts the day in the stored zone, whatever the browser sends', () => {
    assert.equal(visitTimezones('Asia/Kolkata', 'Pacific/Kiritimati').countIn, 'Asia/Kolkata');
  });

  it('adopts a new zone only on a visit that is a new day anyway', () => {
    const z = visitTimezones('Asia/Kolkata', 'Europe/London');
    assert.equal(z.storeIfNewDay, 'Europe/London');
    assert.equal(z.storeIfSameDay, 'Asia/Kolkata');
  });

  it('uses the browser zone the first time, and UTC for a bad one', () => {
    assert.deepEqual(visitTimezones(undefined, 'Asia/Kolkata'), { countIn: 'Asia/Kolkata', storeIfNewDay: 'Asia/Kolkata', storeIfSameDay: 'Asia/Kolkata' });
    assert.equal(visitTimezones(undefined, 'nonsense').countIn, 'UTC');
    assert.equal(visitTimezones('nonsense', 'Asia/Kolkata').countIn, 'Asia/Kolkata');
  });
});
