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
   * Newsletter sign-up through the `subscribe` Cloud Function, which drops
   * duplicates server-side. It answers the same whether or not the email was
   * already subscribed, so the form can't be used to test email addresses.
   */
  subscribe(subscriber: Pick<Subscriber, 'firstName' | 'lastName' | 'email'>): Observable<void> {
    const subscribeFn = httpsCallable<{ firstName: string; lastName: string; email: string }, { ok: boolean }>(
      getWiofFunctions(),
      'subscribe'
    );
    return from(
      subscribeFn({
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        email: subscriber.email.trim().toLowerCase()
      }).then(() => undefined)
    );
  }
}
