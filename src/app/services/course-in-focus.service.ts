import { Injectable } from '@angular/core';
import { CourseInFocus } from '../models/CourseInFocus';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from '@angular/fire/compat/firestore';
import { map } from 'rxjs/operators';
import { from, Observable } from 'rxjs';
import { FIREBASE_COLLECTION, ITEM_STATUS } from '../app.constants';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class CourseInFocusService {
  courseInFocusCollection: AngularFirestoreCollection<any>;
  viewEditModeCourseInFocus: CourseInFocus;

  constructor(
    private storage: AngularFireStorage,
    private database: AngularFirestore,
    private sanitizer: DomSanitizer
  ) {
    this.courseInFocusCollection = this.database.collection(
      FIREBASE_COLLECTION.COURSE_IN_FOCUS
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
    const courseInFocusCollectn = this.database.collection(
      FIREBASE_COLLECTION.COURSE_IN_FOCUS,
      (ref) => {
        let q: firebase.default.firestore.CollectionReference | any = ref;
        if (category !== undefined) {
          q = q.where('category', '==', category);
        }
        return q.orderBy('publishDate', 'desc');
      }
    );

    return courseInFocusCollectn.get().pipe(
      map((querySnapshot) =>
        querySnapshot.docs.map((doc) => {
          const data = doc.data() as CourseInFocus;
          data.id = doc.id;
          data.image$ = this.getImage(data.image);
          return data;
        })
      )
    );
  }

  getImage(image: string): Observable<string> {
    const ref = this.storage.ref(
      `/${FIREBASE_COLLECTION.COURSE_IN_FOCUS_IMAGE_STORAGE}/${image}`
    ); // creates reference to storage item using the link in parameter
    return ref.getDownloadURL(); // pulls the download URL which is an observable , handle accordingly
  }

  getActiveCoursesInFocus(category?: string): Observable<Array<CourseInFocus>> {
    const courseInFocusCollectn = this.database.collection(
      FIREBASE_COLLECTION.COURSE_IN_FOCUS,
      (ref) => {
        const query = ref
          .where('status', '==', ITEM_STATUS.PUBLISHED)
          .orderBy('submitDate', 'desc');
        if (category !== undefined) {
          return query.where('category', '==', category);
        }
        return query;
      }
    );
    return courseInFocusCollectn.get().pipe(
      map((querySnapshot) =>
        querySnapshot.docs.map((doc) => {
          const data = doc.data() as CourseInFocus;
          data.id = doc.id;
          data.image$ = this.getImage(data.image);
          return data;
        })
      )
    );
  }

  publishCourseInFocus(id: string) {
    return from(
      this.courseInFocusCollection.doc(id).update({
        status: ITEM_STATUS.PUBLISHED,
        publishDate: new Date().getTime(),
        unpublishDate: null
      })
    );
  }

  unpublishCourseInFocus(id: string) {
    return this.database
      .collection(FIREBASE_COLLECTION.COURSE_IN_FOCUS)
      .doc(id)
      .update({
        status: ITEM_STATUS.INACTIVE,
        unpublishDate: new Date().getTime()
      });
  }

  saveCourseInFocusImage(imageData: any, imageName: string) {
    const imageUploadTask = this.storage.upload(
      `/${FIREBASE_COLLECTION.COURSE_IN_FOCUS_IMAGE_STORAGE}/${imageName}`,
      imageData
    );
    return from(imageUploadTask);
  }

  deleteCourseInFocusImage(imageName: string) {
    return this.storage
      .ref(`/${FIREBASE_COLLECTION.COURSE_IN_FOCUS_IMAGE_STORAGE}/${imageName}`)
      .delete();
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
