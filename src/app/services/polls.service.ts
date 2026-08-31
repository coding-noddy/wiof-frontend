import { Injectable } from '@angular/core';
import { Poll } from '../models/Poll';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from '@angular/fire/compat/firestore';
import { map } from 'rxjs/operators';
import { from, Observable } from 'rxjs';
import { httpsCallable } from 'firebase/functions';
import { FIREBASE_COLLECTION } from '../app.constants';
import { getWiofFunctions } from '../util/cloud-functions.util';

/** Public, sanitized poll aggregate — no email/IP. Maintained by the
 *  onPollVoteCreated Cloud Function; mirrors what it writes to `poll_results`. */
export interface PollResults {
  pollQuestionId: string;
  totalVotes: number;
  optionCounts: Record<string, number>;
}

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
   * Raw `Polls` documents are admin-only to read (they carry email/IP), so this
   * goes through the checkPollEmailVoted Cloud Function instead of a direct
   * client query.
   */
  hasEmailVoted(pollQuestionId: string, email: string): Observable<{ voted: boolean; option?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const checkEmailVoted = httpsCallable<
      { pollQuestionId: string; email: string },
      { voted: boolean; option?: string }
    >(getWiofFunctions(), 'checkPollEmailVoted');

    return from(
      checkEmailVoted({ pollQuestionId, email: normalizedEmail }).then((result) => result.data)
    );
  }

  /**
   * Reads the sanitized public aggregate for a poll (vote counts per option,
   * no email/IP). This is what public-facing poll displays should read from —
   * `getPolls()` below returns the raw, admin-only vote documents.
   */
  getPollResults(pollQuestionId: string): Observable<PollResults> {
    return this.database
      .collection(FIREBASE_COLLECTION.POLL_RESULTS)
      .doc<PollResults>(pollQuestionId)
      .valueChanges()
      .pipe(
        map((doc) => doc || { pollQuestionId, totalVotes: 0, optionCounts: {} })
      );
  }

  /** Raw vote documents (email/IP + option) — admin-only per firestore.rules. */
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
