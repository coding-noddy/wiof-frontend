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

  /** '' (not set) or 'HH:MM' 24h — same check as firestore.rules. */
  static isValidTime(time: string): boolean {
    return !time || /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  }

  /** 'YYYY-MM-DD' as a local Date for showing the day (new Date('YYYY-MM-DD')
   *  would be UTC and could show the previous day west of UTC). */
  static eventDateAsDate(eventDate: string): Date {
    const [y, m, d] = eventDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  /**
   * Workshop times are India time (IST, UTC+5:30) for every visitor, so one
   * abroad sees a workshop move to Past at the real moment it ends.
   */
  private static istInstant(eventDate: string, time: string): Date {
    return new Date(`${eventDate}T${time}+05:30`);
  }

  /** When it starts, or null if no start time is set. */
  static startsAt(workshop: Workshop): Date | null {
    return workshop.startTime ? WorkshopService.istInstant(workshop.eventDate, `${workshop.startTime}:00`) : null;
  }

  /** When it moves to Past: its end time, else the end of the day (IST). */
  static endsAt(workshop: Workshop): Date {
    return WorkshopService.istInstant(
      workshop.eventDate,
      workshop.endTime ? `${workshop.endTime}:00` : '23:59:59'
    );
  }

  static isOver(workshop: Workshop, now: Date = new Date()): boolean {
    return now.getTime() >= WorkshopService.endsAt(workshop).getTime();
  }

  /** Started (a start time is set and has passed) but not yet ended. */
  static isLiveNow(workshop: Workshop, now: Date = new Date()): boolean {
    const start = WorkshopService.startsAt(workshop);
    return !!start && now.getTime() >= start.getTime() && !WorkshopService.isOver(workshop, now);
  }

  /** "5:00 PM – 7:00 PM IST", "5:00 PM IST", "Until 7:00 PM IST", or ''. */
  static timeLabel(workshop: Workshop): string {
    const fmt = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    };
    const { startTime, endTime } = workshop;
    if (startTime && endTime) return `${fmt(startTime)} – ${fmt(endTime)} IST`;
    if (startTime) return `${fmt(startTime)} IST`;
    if (endTime) return `Until ${fmt(endTime)} IST`;
    return '';
  }

  /**
   * Published workshops for /climatenlighten, split by whether they've ended:
   * upcoming soonest first, past most recent first (at most `pastLimit`).
   * The `published == true` filter is required: firestore.rules only let
   * the public read published docs.
   */
  getPublishedWorkshops(now: Date = new Date(), pastLimit = 6): Observable<{ upcoming: Workshop[]; past: Workshop[] }> {
    const byStart = (a: Workshop, b: Workshop) =>
      `${a.eventDate} ${a.startTime || ''}`.localeCompare(`${b.eventDate} ${b.startTime || ''}`);
    return this.database
      .collection(FIREBASE_COLLECTION.WORKSHOPS, (ref) => ref.where('published', '==', true))
      .get()
      .pipe(
        map((snapshot) => {
          const all = snapshot.docs.map((doc) => ({ ...(doc.data() as Workshop), id: doc.id }));
          return {
            upcoming: all.filter((w) => !WorkshopService.isOver(w, now)).sort(byStart),
            past: all
              .filter((w) => WorkshopService.isOver(w, now))
              .sort((a, b) => byStart(b, a))
              .slice(0, pastLimit)
          };
        })
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
          startTime: workshop.startTime || '',
          endTime: workshop.endTime || '',
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
