import { Injectable } from '@angular/core';
import { Poll } from '../models/Poll';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from '@angular/fire/compat/firestore';
import { map } from 'rxjs/operators';
import { from, Observable } from 'rxjs';
import { FIREBASE_COLLECTION } from '../app.constants';

@Injectable({
  providedIn: 'root'
})
export class PollsService {
  private pollsCollection: AngularFirestoreCollection<any>;

  constructor(public database: AngularFirestore) {
    this.pollsCollection = this.database.collection(
      // FIREBASE_COLLECTION.SUBSCRIPTIONS
      FIREBASE_COLLECTION.POLLS
    );
  }

  savePolls(poll: Poll) {
    // from is used to create an observable from promise
    return from(this.pollsCollection.add({ ...poll }));
  }

  /**
   * Checks whether a vote already exists for this poll under the given email,
   * regardless of whether that vote was cast as a guest or an authenticated user.
   */
  hasEmailVoted(pollQuestionId: string, email: string): Observable<{ voted: boolean; option?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    return this.database
      .collection<Poll>(FIREBASE_COLLECTION.POLLS, (ref) =>
        ref
          .where('pollQuestionId', '==', pollQuestionId)
          .where('email', '==', normalizedEmail)
          .limit(1)
      )
      .get()
      .pipe(
        map((snapshot) => {
          if (snapshot.empty) {
            return { voted: false };
          }
          const data = snapshot.docs[0].data() as Poll;
          return { voted: true, option: data.option };
        })
      );
  }

  getPolls(pollQuestionId: string): Observable<Poll[]> {
    // getPolls(): Observable<Polls[]>{
    const pollsCollectionById = this.database.collection(
      FIREBASE_COLLECTION.POLLS,
      (ref) => ref.where('pollQuestionId', '==', pollQuestionId)
    );
    return pollsCollectionById.get().pipe(
      map((querySnapshot) =>
        querySnapshot.docs.map((doc) => {
          const data = doc.data() as Poll;
          data.id = doc.id;
          return data;
        })
      )
    );
  }
}
