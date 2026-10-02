import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Observable, from, of } from 'rxjs';
import { catchError, first, map } from 'rxjs/operators';
import { HeroVideo } from '../models/HeroVideo';
import {
  FIREBASE_COLLECTION,
  HERO_VIDEO_SLOTS,
  VIDEO_PLAYER_TITLES,
  VIDEO_PLAYER_VIDEOS
} from '../app.constants';
import { AdminWriteGuardService } from './admin-write-guard.service';

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

@Injectable({
  providedIn: 'root'
})
export class HeroVideoService {
  constructor(
    private database: AngularFirestore,
    private afAuth: AngularFireAuth,
    private adminWriteGuard: AdminWriteGuardService
  ) {}

  /**
   * Hero video for a VideoWidgetComponent `element` input ('air', ...,
   * 'config' for Our Purpose). Never errors — falls back to the built-in
   * default if the doc is missing or the read fails, so the widget always
   * has something to play.
   */
  getHeroVideoForWidget(widgetKey: string): Observable<HeroVideo> {
    const slot = HERO_VIDEO_SLOTS.find((s) => s.widgetKey === widgetKey);
    const fallback = this.defaultFor(widgetKey, slot?.id || widgetKey);
    if (!slot) {
      return of(fallback);
    }
    return this.database
      .collection(FIREBASE_COLLECTION.HERO_VIDEOS)
      .doc(slot.id)
      .get()
      .pipe(
        map((doc) => (doc.exists ? this.toHeroVideo(slot.id, doc.data()) : fallback)),
        map((video) => (video.videoId ? video : fallback)),
        catchError(() => of(fallback))
      );
  }

  /** Every slot, in HERO_VIDEO_SLOTS order, for the Admin page. Slots with
   *  no doc yet come back as their built-in default (isDefault: true). */
  getAllHeroVideos(): Observable<HeroVideo[]> {
    return this.database
      .collection(FIREBASE_COLLECTION.HERO_VIDEOS)
      .get()
      .pipe(
        map((snapshot) => {
          const byId = new Map(snapshot.docs.map((d) => [d.id, d.data()]));
          return HERO_VIDEO_SLOTS.map((slot) =>
            byId.has(slot.id)
              ? this.toHeroVideo(slot.id, byId.get(slot.id))
              : this.defaultFor(slot.widgetKey, slot.id)
          );
        })
      );
  }

  /** Admin-only, enforced client-side here as defense-in-depth and
   *  server-side by firestore.rules (isAdmin() + slot/videoId checks). */
  saveHeroVideo(slotId: string, title: string, videoId: string): Observable<void> {
    return from(
      this.adminWriteGuard.assertAdmin().then(async () => {
        const user = await this.afAuth.authState.pipe(first()).toPromise();
        return this.database
          .collection(FIREBASE_COLLECTION.HERO_VIDEOS)
          .doc(slotId)
          .set({
            title: title.trim(),
            videoId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: user?.email || user?.uid || ''
          });
      })
    );
  }

  /**
   * Accepts a bare 11-char video ID or any common YouTube URL form
   * (watch?v=, youtu.be/, embed/, shorts/, live/) and returns the ID, or
   * null if none can be found.
   */
  static parseYoutubeId(input: string): string | null {
    const value = (input || '').trim();
    if (YOUTUBE_ID_PATTERN.test(value)) {
      return value;
    }
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    } catch {
      return null;
    }
    const host = url.hostname.replace(/^(www|m)\./, '');
    let candidate: string | null = null;
    if (host === 'youtu.be') {
      candidate = url.pathname.split('/')[1];
    } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      candidate =
        url.searchParams.get('v') ||
        url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1] ||
        null;
    }
    return candidate && YOUTUBE_ID_PATTERN.test(candidate) ? candidate : null;
  }

  private toHeroVideo(id: string, data: any): HeroVideo {
    return {
      id,
      title: data?.title || '',
      videoId: data?.videoId || '',
      updatedAt: data?.updatedAt,
      updatedBy: data?.updatedBy
    };
  }

  private defaultFor(widgetKey: string, id: string): HeroVideo {
    const key = (widgetKey || '').toUpperCase();
    return {
      id,
      title: VIDEO_PLAYER_TITLES[key] || '',
      videoId: VIDEO_PLAYER_VIDEOS[key] || '',
      isDefault: true
    };
  }
}
