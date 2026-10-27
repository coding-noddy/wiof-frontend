/**
 * A ClimatEnlighten workshop on /climatenlighten: under Upcoming until it
 * ends, then under Past Workshops. The poster image carries the details people scan for (date, time,
 * price); the card adds a short description and the registration link.
 */
export interface Workshop {
  id?: string;
  title: string;
  description: string;
  /** 'YYYY-MM-DD'. Text, not a timestamp, so it never shifts a day across
   *  time zones and sorts correctly as a string. */
  eventDate: string;
  /** Optional 'HH:MM' (24h), India time (IST). Shown on the card. */
  startTime?: string;
  /** Optional 'HH:MM' (24h), IST. The workshop moves to Past Workshops once
   *  this has passed; without it, at the end of the event day (IST). */
  endTime?: string;
  /** Optional one-liner, e.g. "Online (Zoom)" or a venue. */
  modeOrVenue: string;
  /** Any http(s) web link (Google Form, payment page, event page…),
   *  checked in firestore.rules too. */
  registrationUrl: string;
  /** File name in Storage `workshop-posters/`. */
  posterName: string;
  /** Download URL saved at upload time, so the page needs no
   *  getDownloadURL() call per card. */
  posterUrl: string;
  published: boolean;
  updatedAt?: any;
  updatedBy?: string;
}
