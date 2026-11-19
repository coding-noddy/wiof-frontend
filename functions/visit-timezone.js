/**
 * Which time zone a visit's calendar day is counted in (recordUserVisit,
 * the visit streak behind Seven Sunrises and Thirty Dawns; Passport v1).
 *
 * Before: each call used whatever time zone the browser sent, so switching
 * zones between two calls could make "today" a new day and add a streak day.
 * Now the member's stored zone decides the day, and a different zone the
 * browser sends is adopted only on a visit that is a new day anyway, so a
 * traveller's zone still follows them (from the next day) but a switch can
 * never create a day. A streak is never reset by this.
 */

/** A real IANA time zone the runtime knows, or null. */
function validTimezone(tz) {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return null;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

/**
 * @param {string|undefined} stored users/{uid}.visitTimezone
 * @param {string|undefined} supplied what the browser sent
 * @returns {{ countIn: string, storeIfNewDay: string, storeIfSameDay: string }}
 *   countIn: the zone to work out today and the last visit's day;
 *   storeIfNewDay / storeIfSameDay: the visitTimezone to keep after this visit.
 */
function visitTimezones(stored, supplied) {
  const s = validTimezone(stored);
  const browser = validTimezone(supplied) || 'UTC';
  const countIn = s || browser;
  return { countIn, storeIfNewDay: browser, storeIfSameDay: countIn };
}

module.exports = { validTimezone, visitTimezones };
