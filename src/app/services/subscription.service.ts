import { Injectable } from '@angular/core';
import { Subscriber } from '../models/Subscriber';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from '@angular/fire/compat/firestore';
import { from } from 'rxjs';
import { httpsCallable } from 'firebase/functions';
import { FIREBASE_COLLECTION } from '../app.constants';
import { getWiofFunctions } from '../util/cloud-functions.util';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  subscriptionsCollection: AngularFirestoreCollection<any>;

  constructor(public database: AngularFirestore) {
    this.subscriptionsCollection = this.database.collection(
      FIREBASE_COLLECTION.SUBSCRIPTIONS
    );
  }

  getSubscribers(): Observable<Subscriber[]> {
    return this.subscriptionsCollection.get().pipe(
      map((querySnapshot) =>
        querySnapshot.docs.map((doc) => {
          const data = doc.data() as Subscriber;
          data.id = doc.id;
          return data;
        })
      )
    );
  }

  /**
   * Checks whether an email is already subscribed via the checkSubscriberExists
   * Cloud Function rather than a direct client query — the Subscriptions
   * collection is admin-only to read (see firestore.rules), so this is the
   * only path that can answer "already subscribed?" for a public visitor.
   */
  findSubscriber(email: string): Observable<Boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const checkExists = httpsCallable<{ email: string }, { exists: boolean }>(
      getWiofFunctions(),
      'checkSubscriberExists'
    );
    return from(checkExists({ email: normalizedEmail }).then((result) => result.data.exists));
  }

  saveSubscriber(subscriber: Subscriber) {
    // from create an observable from promise
    return from(this.subscriptionsCollection.add({ ...subscriber }));
  }
}
