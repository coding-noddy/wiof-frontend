/**
 * A ClimatEnlighten workshop, shown on /climatenlighten until its date has
 * passed. The poster image carries the details people scan for (date, time,
 * price); the card adds a short description and the Google Form link.
 */
export interface Workshop {
  id?: string;
  title: string;
  description: string;
  /** 'YYYY-MM-DD'. Text, not a timestamp, so it never shifts a day across
   *  time zones and sorts correctly as a string. */
  eventDate: string;
  /** Optional one-liner, e.g. "Online (Zoom)" or a venue. */
  modeOrVenue: string;
  /** Google Forms link only (docs.google.com/forms/… or forms.gle/…),
   *  enforced in firestore.rules too. */
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
