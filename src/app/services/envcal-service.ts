import { Injectable } from '@angular/core';

import { EnvDay } from '../models/env-cal-data';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { map } from 'rxjs/operators';
import { forkJoin, from, Observable } from 'rxjs';
import { FIREBASE_COLLECTION } from '../app.constants';
import { AdminWriteGuardService } from './admin-write-guard.service';

@Injectable({
  providedIn: 'root'
})
export class EnvcalService {
  envcalCollectionByMonth: AngularFirestoreCollection<any>;
  envcalCollection: AngularFirestoreCollection<any>;
  private viewEditModeOccasion: EnvDay;

  constructor(
    private storage: AngularFireStorage,
    public database: AngularFirestore,
    private adminWriteGuard: AdminWriteGuardService
  ) {
    this.envcalCollection = this.database.collection(
      FIREBASE_COLLECTION.ENVCAL
    );
  }

  getEnvCal(month: number): Observable<EnvDay[]> {
    console.log('month:', month);
    this.envcalCollectionByMonth = this.database.collection(
      FIREBASE_COLLECTION.ENVCAL,
      (ref) => ref.where('month', '==', month)
    );
    return this.envcalCollectionByMonth.get().pipe(
      map((querySnapshot) =>
        querySnapshot.docs.map((doc) => {
          const data = doc.data() as EnvDay;
          data.id = doc.id;
          data.image = this.getImage(data.imageName);
          return data;
        })
      )
    );
  }

  /**
   * Returns the fixed-date occasions (annual observance days) that fall on
   * `fromDate` (today) plus the following `upcomingDays` days, for the home
   * page's agenda widget. EnvDay has no `year`, so this is inherently
   * annual/fixed-date only — recurring (weekly/monthly) or one-time dated
   * events aren't representable in this collection yet.
   */
  getUpcomingOccasions(
    fromDate: Date = new Date(),
    upcomingDays: number = 7
  ): Observable<{ today: EnvDay[]; upcoming: { date: Date; days: EnvDay[] }[] }> {
    const dates = Array.from({ length: upcomingDays }, (_, i) => {
      const d = new Date(fromDate);
      d.setDate(fromDate.getDate() + i);
      return d;
    });

    const months = Array.from(new Set(dates.map((d) => d.getMonth())));

    return forkJoin(months.map((month) => this.getEnvCal(month))).pipe(
      map((monthResults) => {
        const allDays = monthResults.reduce(
          (acc, days) => acc.concat(days),
          [] as EnvDay[]
        );
        const matching = (date: Date) =>
          allDays.filter(
            (d) => Number(d.day) === date.getDate() && d.month === date.getMonth()
          );
        const [todayDate, ...restDates] = dates;
        return {
          today: matching(todayDate),
          upcoming: restDates.map((date) => ({ date, days: matching(date) }))
        };
      })
    );
  }

  getOccasion(id: string): Observable<EnvDay> {
    const occassionDoc = this.database.doc<EnvDay>(
      `${FIREBASE_COLLECTION.ENVCAL}/${id}`
    );
    return occassionDoc.get().pipe(
      map((querySnapshot) => {
        if (!querySnapshot.exists) {
          return null;
        } else {
          var data = querySnapshot.data() as EnvDay;
          data.id = querySnapshot.id;
          data.image = this.getImage(data.imageName);
          return data;
        }
      })
    );
  }

  getImage(Image: string): Observable<String> {
    const ref = this.storage.ref(
      `/${FIREBASE_COLLECTION.ENVCAL_IMAGE_STORAGE}/${Image}`
    ); //creates reference to storage item using the link in parameter
    return ref.getDownloadURL(); //pulls the download URL which is an observable , handle accordingly
  }

  //to-do link images to each envday obj

  saveOccasionImage(imageData: any, imageName: string) {
    const imageUploadTask = this.storage.upload(
      `/${FIREBASE_COLLECTION.ENVCAL_IMAGE_STORAGE}/${imageName}`,
      imageData
    );
    return from(imageUploadTask);
  }

  deleteOccasionImage(imageName: string) {
    return this.storage
      .ref(`/${FIREBASE_COLLECTION.ENVCAL_IMAGE_STORAGE}/${imageName}`)
      .delete();
  }

  saveOccasion(occasion: EnvDay) {
    return from(
      this.adminWriteGuard.assertAdmin().then((): any => {
        if (occasion.id !== null) {
          return this.envcalCollection.doc(occasion.id.valueOf()).update({
            ...occasion
          });
        } else {
          return this.envcalCollection.add({ ...occasion });
        }
      })
    );
  }

  deleteOccasion(occasionId: string) {
    return from(
      this.adminWriteGuard.assertAdmin().then(() =>
        this.envcalCollection.doc(occasionId).delete()
      )
    );
  }

  setViewEditModeOccasion(occasion: EnvDay) {
    this.viewEditModeOccasion = { ...occasion };
  }

  getViewEditModeOccasion() {
    return this.viewEditModeOccasion;
  }

  clearViewEditModeOccasion() {
    this.viewEditModeOccasion = null;
  }
}
