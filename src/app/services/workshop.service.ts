import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Observable, firstValueFrom, from } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { FIREBASE_COLLECTION } from '../app.constants';
import { Workshop } from '../models/Workshop';
import { uploadCompressedImage } from '../util/image-compression.util';
import { AdminWriteGuardService } from './admin-write-guard.service';

/** Same check as firestore.rules: a Google Forms link, nothing else. */
const GOOGLE_FORM_URL = /^https:\/\/(docs\.google\.com\/forms\/|forms\.gle\/)\S+$/;

@Injectable({
  providedIn: 'root'
})
export class WorkshopService {
  constructor(
    private database: AngularFirestore,
    private storage: AngularFireStorage,
    private afAuth: AngularFireAuth,
    private adminWriteGuard: AdminWriteGuardService
  ) {}

  static isGoogleFormUrl(url: string): boolean {
    return GOOGLE_FORM_URL.test((url || '').trim());
  }

  /** Today as 'YYYY-MM-DD' in the visitor's own time zone. */
  static today(now: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  /** 'YYYY-MM-DD' as a local Date (new Date('YYYY-MM-DD') would be UTC). */
  static eventDateAsDate(eventDate: string): Date {
    const [y, m, d] = eventDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  /**
   * Published workshops that haven't happened yet (today's still shows),
   * soonest first, for /climatenlighten. The `published == true` filter is
   * required: firestore.rules only let the public read published docs.
   */
  getUpcomingWorkshops(now: Date = new Date()): Observable<Workshop[]> {
    const today = WorkshopService.today(now);
    return this.database
      .collection(FIREBASE_COLLECTION.WORKSHOPS, (ref) => ref.where('published', '==', true))
      .get()
      .pipe(
        map((snapshot) =>
          snapshot.docs
            .map((doc) => ({ ...(doc.data() as Workshop), id: doc.id }))
            .filter((w) => w.eventDate >= today)
            .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
        )
      );
  }

  /** Every workshop, newest date first, for the Admin page. */
  getAllWorkshops(): Observable<Workshop[]> {
    return this.database
      .collection(FIREBASE_COLLECTION.WORKSHOPS)
      .get()
      .pipe(
        map((snapshot) =>
          snapshot.docs
            .map((doc) => ({ ...(doc.data() as Workshop), id: doc.id }))
            .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
        )
      );
  }

  /**
   * Creates or updates a workshop. A new poster is compressed and uploaded
   * first, and its download URL saved with the doc; the replaced poster is
   * then deleted. Admin-only, here and in firestore.rules.
   */
  saveWorkshop(workshop: Workshop, newPoster?: File): Observable<void> {
    return from(
      this.adminWriteGuard.assertAdmin().then(async () => {
        let { posterName, posterUrl } = workshop;
        const replacedPoster = newPoster && workshop.posterName ? workshop.posterName : null;
        if (newPoster) {
          posterName = `workshop_${Date.now()}.${newPoster.name.split('.').pop()}`;
          const path = `/${FIREBASE_COLLECTION.WORKSHOP_POSTER_STORAGE}/${posterName}`;
          await firstValueFrom(uploadCompressedImage(this.storage, path, newPoster));
          posterUrl = await firstValueFrom(this.storage.ref(path).getDownloadURL());
        }
        const user = await firstValueFrom(this.afAuth.authState.pipe(first()));
        const data: Workshop = {
          title: workshop.title.trim(),
          description: workshop.description.trim(),
          eventDate: workshop.eventDate,
          modeOrVenue: (workshop.modeOrVenue || '').trim(),
          registrationUrl: workshop.registrationUrl.trim(),
          posterName,
          posterUrl,
          published: !!workshop.published,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: user?.email || user?.uid || ''
        };
        const collection = this.database.collection(FIREBASE_COLLECTION.WORKSHOPS);
        if (workshop.id) {
          await collection.doc(workshop.id).set(data);
        } else {
          await collection.add(data);
        }
        if (replacedPoster) {
          await this.deletePoster(replacedPoster);
        }
      })
    );
  }

  /** Deletes the workshop and its poster. */
  deleteWorkshop(workshop: Workshop): Observable<void> {
    return from(
      this.adminWriteGuard.assertAdmin().then(async () => {
        await this.database.collection(FIREBASE_COLLECTION.WORKSHOPS).doc(workshop.id).delete();
        if (workshop.posterName) {
          await this.deletePoster(workshop.posterName);
        }
      })
    );
  }

  /** A missing poster file isn't an error: the doc is what matters. */
  private async deletePoster(posterName: string): Promise<void> {
    try {
      await firstValueFrom(
        this.storage.ref(`/${FIREBASE_COLLECTION.WORKSHOP_POSTER_STORAGE}/${posterName}`).delete()
      );
    } catch (e) {
      console.warn('Could not delete old workshop poster', posterName, e);
    }
  }
}
