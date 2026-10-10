import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Observable, from, of } from 'rxjs';
import { catchError, first, map, timeout } from 'rxjs/operators';
import { FIREBASE_COLLECTION } from '../app.constants';
import { AdminWriteGuardService } from './admin-write-guard.service';

export interface LaunchCeremonySetting {
  enabled: boolean;
  updatedAt?: any;
  updatedBy?: string;
}

const DOC_ID = 'launch_ceremony';

/**
 * The launch-day curtain + ribbon-cutting overlay, switched on/off from
 * Admin → Launch Ceremony (or directly in the Firestore console:
 * site_settings/launch_ceremony { enabled: true|false }).
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
   * Whether visitors should see the ceremony. Fail-safe: a missing doc, a
   * read error or a slow network (5s) all mean "off", so the ceremony can
   * never keep anyone out of the site.
   */
  isEnabled(): Observable<boolean> {
    return this.getSetting().pipe(
      map((setting) => setting.enabled),
      timeout(5000),
      catchError(() => of(false))
    );
  }

  getSetting(): Observable<LaunchCeremonySetting> {
    return this.database
      .collection(FIREBASE_COLLECTION.SITE_SETTINGS)
      .doc(DOC_ID)
      .get()
      .pipe(
        map((doc) => {
          const data = doc.exists ? (doc.data() as any) : null;
          return {
            enabled: data?.enabled === true,
            updatedAt: data?.updatedAt,
            updatedBy: data?.updatedBy
          };
        })
      );
  }

  /** Admin-only, enforced client-side here as defense-in-depth and
   *  server-side by firestore.rules (isAdmin() + known doc id + bool). */
  setEnabled(enabled: boolean): Observable<void> {
    return from(
      this.adminWriteGuard.assertAdmin().then(async () => {
        const user = await this.afAuth.authState.pipe(first()).toPromise();
        return this.database
          .collection(FIREBASE_COLLECTION.SITE_SETTINGS)
          .doc(DOC_ID)
          .set({
            enabled,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: user?.email || user?.uid || ''
          });
      })
    );
  }
}
