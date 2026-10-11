import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Observable, from, of } from 'rxjs';
import { catchError, first, map } from 'rxjs/operators';
import { FIREBASE_COLLECTION } from '../app.constants';
import { AdminWriteGuardService } from './admin-write-guard.service';

export interface LaunchCeremonySetting {
  enabled: boolean;
  /** While true, visitors see the curtain but can't cut the ribbon yet
   *  (button disabled, no Skip) — an admin unlocks it at launch time. */
  ribbonLocked: boolean;
  /** Optional "3:30 PM IST" shown on the curtain while locked. */
  opensAtLabel?: string;
  updatedAt?: any;
  updatedBy?: string;
}

const DOC_ID = 'launch_ceremony';
const OFF: LaunchCeremonySetting = { enabled: false, ribbonLocked: false };

/**
 * The launch-day curtain + ribbon-cutting overlay, switched on/off from
 * Admin → Launch Ceremony (or directly in the Firestore console:
 * site_settings/launch_ceremony { enabled, ribbonLocked, opensAtLabel }).
 */
@Injectable({
  providedIn: 'root'
})
export class LaunchCeremonyService {
  constructor(
    private database: AngularFirestore,
    private afAuth: AngularFireAuth,
    private adminWriteGuard: AdminWriteGuardService
  ) {}

  /**
   * Live setting for visitors, so unlocking the ribbon reaches every open
   * page at once. Fail-safe: a missing doc or a read error means "off", so
   * the ceremony can never keep anyone out of the site.
   */
  watch(): Observable<LaunchCeremonySetting> {
    return this.database
      .collection(FIREBASE_COLLECTION.SITE_SETTINGS)
      .doc(DOC_ID)
      .valueChanges()
      .pipe(
        map((data) => this.normalize(data)),
        catchError(() => of(OFF))
      );
  }

  getSetting(): Observable<LaunchCeremonySetting> {
    return this.database
      .collection(FIREBASE_COLLECTION.SITE_SETTINGS)
      .doc(DOC_ID)
      .get()
      .pipe(map((doc) => this.normalize(doc.exists ? doc.data() : null)));
  }

  /** Admin-only, enforced client-side here as defense-in-depth and
   *  server-side by firestore.rules (isAdmin() + known doc id + types). */
  setEnabled(enabled: boolean): Observable<void> {
    return this.write({ enabled });
  }

  setRibbonLocked(ribbonLocked: boolean): Observable<void> {
    return this.write({ ribbonLocked });
  }

  private write(fields: Partial<LaunchCeremonySetting>): Observable<void> {
    return from(
      this.adminWriteGuard.assertAdmin().then(async () => {
        const user = await this.afAuth.authState.pipe(first()).toPromise();
        const ref = this.database.collection(FIREBASE_COLLECTION.SITE_SETTINGS).doc(DOC_ID);
        const current = await ref.get().pipe(first()).toPromise();
        const existing = current?.exists ? (current.data() as any) : {};
        // Merge, so turning the ceremony on/off keeps the lock state and
        // label (and vice versa); `enabled` must always be present (rules).
        return ref.set(
          {
            enabled: existing?.enabled === true,
            ...fields,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: user?.email || user?.uid || ''
          },
          { merge: true }
        );
      })
    );
  }

  private normalize(data: any): LaunchCeremonySetting {
    if (!data) {
      return OFF;
    }
    return {
      enabled: data.enabled === true,
      ribbonLocked: data.ribbonLocked === true,
      opensAtLabel: typeof data.opensAtLabel === 'string' && data.opensAtLabel.trim() ? data.opensAtLabel.trim() : undefined,
      updatedAt: data.updatedAt,
      updatedBy: data.updatedBy
    };
  }
}
