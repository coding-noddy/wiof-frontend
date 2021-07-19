import { Injectable } from '@angular/core';
import { CourseInFocus } from '../models/CourseInFocus';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from '@angular/fire/firestore';
import { map, concatMap } from 'rxjs/operators';
import { from, Observable } from 'rxjs';
import {
  FIREBASE_COLLECTION,
  ITEM_STATUS
} from '../app.constants';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class CourseInFocusService {
  courseInFocusCollection: AngularFirestoreCollection<any>;
  viewEditModeCourseInFocus: CourseInFocus;

  constructor(
    private database: AngularFirestore,
    private sanitizer: DomSanitizer
  ) {
    this.courseInFocusCollection = this.database.collection(
      FIREBASE_COLLECTION.IN_FOCUS
    );
  }

  saveCourseInFocus(courseInFocus: CourseInFocus) {
    let courseInFocus$ = null;
    if (courseInFocus.id !== null) {
      courseInFocus$ = this.courseInFocusCollection
        .doc(courseInFocus.id)
        .update({ ...courseInFocus });
    } else {
      courseInFocus$ = this.courseInFocusCollection.add({ ...courseInFocus });
    }
    return from(courseInFocus$);
  }

  getCoursesInFocus(category?: string): Observable<CourseInFocus[]> {
    let courseInFocusCollectn = this.database.collection(
      FIREBASE_COLLECTION.IN_FOCUS
    );
    if (category !== undefined) {
      courseInFocusCollectn = this.database.collection(
        FIREBASE_COLLECTION.IN_FOCUS,
        (ref) => ref.where('category', '==', category)
      );
    }
    return courseInFocusCollectn.get().pipe(
      map((querySnapshot) =>
        querySnapshot.docs.map((doc) => {
          const data = doc.data() as CourseInFocus;
          data.id = doc.id;
          return data;
        })
      )
    );
  }

  getActiveCourseInFocus(): Observable<CourseInFocus> | null {
    const courseInFocusCollectn = this.database.collection(
      FIREBASE_COLLECTION.IN_FOCUS,
      (ref) =>
        ref
        .where('status', '==', ITEM_STATUS.PUBLISHED)
        .limit(1)
    );
    return courseInFocusCollectn.get().pipe(
      map((querySnapshot) => {
        if (querySnapshot.docs.length > 0) {
          const data = querySnapshot.docs[0].data() as CourseInFocus;
          data.id = querySnapshot.docs[0].id;
          return data;
        }
        return null;
      })
    );
  }

  publishCourseInFocus(id: string, category: string) {
    return this.unpublishCourseInFocus(category).pipe(
      concatMap(() => {
        return this.courseInFocusCollection.doc(id).update({
          status: ITEM_STATUS.PUBLISHED,
          publishDate: new Date().getTime(),
          unpublishDate: null
        });
      })
    );
  }

  unpublishCourseInFocus(id: string) {
    return this.database
      .collection(FIREBASE_COLLECTION.IN_FOCUS, (ref) =>
        ref
          .where('status', '==', ITEM_STATUS.PUBLISHED)
      )
      .get()
      .pipe(
        map((querySnapshot) =>
          querySnapshot.docs.map((doc) => {
            const data = doc.data() as CourseInFocus;
            data.id = doc.id;
            this.courseInFocusCollection.doc(data.id).update({
              status: ITEM_STATUS.INACTIVE,
              unpublishDate: new Date().getTime()
            });
            return data;
          })
        )
      );
  }

  deleteCourseInFocus(id: string) {
    return from(this.courseInFocusCollection.doc(id).delete());
  }

  setViewEditModeCourseInFocus(courseInFocus: CourseInFocus) {
    this.viewEditModeCourseInFocus = { ...courseInFocus };
  }

  getViewEditModeCourseInFocus() {
    return this.viewEditModeCourseInFocus;
  }

  clearViewEditModeCourseInFocus() {
    this.viewEditModeCourseInFocus = null;
  }
}
