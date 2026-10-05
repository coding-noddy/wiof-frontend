import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FIREBASE_COLLECTION } from '../app.constants';
import { Feedback, FeedbackStatus } from '../models/Feedback';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  feedbackCollection: AngularFirestoreCollection<Feedback>;

  constructor(public database: AngularFirestore) {
    this.feedbackCollection = this.database.collection(FIREBASE_COLLECTION.FEEDBACK);
  }

  /** Public submit path — anyone (signed in or not) may create; only admins may read. */
  saveFeedback(feedback: Omit<Feedback, 'id' | 'status' | 'createdAt'>) {
    const doc: Feedback = {
      ...feedback,
      status: 'new',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    // Firestore rejects undefined values, and the create rule only allows
    // optional keys when they hold a string — so drop unset optionals.
    Object.keys(doc).forEach((key) => doc[key] === undefined && delete doc[key]);
    return from(this.feedbackCollection.add(doc));
  }

  /** Admin-only (see firestore.rules). */
  getAllFeedback(): Observable<Feedback[]> {
    return this.database
      .collection<Feedback>(FIREBASE_COLLECTION.FEEDBACK, (ref) => ref.orderBy('createdAt', 'desc'))
      .get()
      .pipe(
        map((snapshot) =>
          snapshot.docs.map((doc) => ({ ...(doc.data() as Feedback), id: doc.id }))
        )
      );
  }

  updateStatus(id: string, status: FeedbackStatus) {
    return from(this.feedbackCollection.doc(id).update({ status }));
  }

  deleteFeedback(id: string) {
    return from(this.feedbackCollection.doc(id).delete());
  }
}
