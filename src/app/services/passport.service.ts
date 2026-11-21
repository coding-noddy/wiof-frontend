import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { FIREBASE_COLLECTION } from '../app.constants';
import { StampDef, StampRecord } from '../models/Passport';

/** passport_holders/{uid}: the Passport is issued with Earthrise. */
export interface PassportHolder {
  issuedAt: Date | null;
  dateKnown: boolean;
}

const toDate = (t: any): Date | null => (t?.toDate ? t.toDate() : null);

/**
 * Reads the Planet Passport (v1): the catalogue, the member's earned stamps
 * and whether their Passport is issued. Read-only: every write is the
 * server's (functions/passport-awards.js, scripts/backfill-passport.js).
 */
@Injectable({ providedIn: 'root' })
export class PassportService {
  /** The catalogue changes only with a sync, so one read per session is enough. */
  private defs$?: Observable<StampDef[]>;

  constructor(private firestore: AngularFirestore) {}

  stampDefs(): Observable<StampDef[]> {
    if (!this.defs$) {
      this.defs$ = this.firestore
        // Published only (drafts are admins'; firestore.rules require this filter).
        .collection<StampDef>(FIREBASE_COLLECTION.PASSPORT_STAMP_DEFS, (ref) => ref.where('status', 'in', ['active', 'retired']))
        .get()
        .pipe(
          map((snap) => snap.docs.map((d) => ({ ...(d.data() as StampDef), id: d.id }))),
          catchError(() => of([] as StampDef[])),
          shareReplay(1)
        );
    }
    return this.defs$;
  }

  /** The member's earned stamps, live (a stamp the server writes appears without a reload). */
  stamps(uid: string): Observable<StampRecord[]> {
    return this.firestore
      .collection(FIREBASE_COLLECTION.PASSPORT_STAMPS, (ref) => ref.where('userId', '==', uid))
      .valueChanges()
      .pipe(
        map((docs: any[]) => docs.map((d) => ({
          stampId: d.stampId, earnedAt: toDate(d.earnedAt), dateKnown: d.dateKnown !== false, source: d.source || '',
          evidence: d.evidence || undefined, defVersion: d.defVersion || undefined
        }))),
        catchError(() => of([] as StampRecord[]))
      );
  }

  /** The member's progress on challenges, live: challengeId → count (server-written). */
  challengeProgress(uid: string): Observable<Record<string, number>> {
    return this.firestore
      .collection('passport_challenge_progress', (ref) => ref.where('userId', '==', uid))
      .valueChanges()
      .pipe(
        map((docs: any[]) => Object.fromEntries(docs.map((d) => [String(d.challengeId), Number(d.count) || 0]))),
        catchError(() => of({} as Record<string, number>))
      );
  }

  /** The member's holder record, live; null until the Passport is issued. */
  holder(uid: string): Observable<PassportHolder | null> {
    return this.firestore
      .doc<any>(`${FIREBASE_COLLECTION.PASSPORT_HOLDERS}/${uid}`)
      .valueChanges()
      .pipe(
        map((d) => (d ? { issuedAt: toDate(d.issuedAt), dateKnown: d.dateKnown !== false } : null)),
        catchError(() => of(null))
      );
  }
}
