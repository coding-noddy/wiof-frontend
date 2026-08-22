import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from '@angular/fire/compat/firestore';
import { DomSanitizer } from '@angular/platform-browser';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  FIREBASE_COLLECTION,
  YOUTUBE_EMBED_VIDEO_LINK
} from '../app.constants';
import { CoffeeConversation } from '../models/CoffeeConversation';
import { AdminWriteGuardService } from './admin-write-guard.service';

@Injectable({
  providedIn: 'root'
})
export class CoffeeConversationService {
  ccCollection: AngularFirestoreCollection<any>;
  viewEditModeCC: CoffeeConversation;

  constructor(
    private database: AngularFirestore,
    private sanitizer: DomSanitizer,
    private adminWriteGuard: AdminWriteGuardService
  ) {
    this.ccCollection = this.database.collection(
      FIREBASE_COLLECTION.COFFEE_CONVERSATIONS
    );
  }

  saveCoffeeConversation(coffeeConversation: CoffeeConversation) {
    return from(
      this.adminWriteGuard.assertAdmin().then((): any => {
        if (coffeeConversation.ccId !== null) {
          return this.ccCollection
            .doc(coffeeConversation.ccId)
            .update({ ...coffeeConversation });
        } else {
          return this.ccCollection.add({ ...coffeeConversation });
        }
      })
    );
  }

  getCoffeeConversations(category?: string): Observable<CoffeeConversation[]> {
    let ccCollectn = this.database.collection(
      FIREBASE_COLLECTION.COFFEE_CONVERSATIONS
    );
    if (category !== undefined) {
      ccCollectn = this.database.collection(
        FIREBASE_COLLECTION.COFFEE_CONVERSATIONS,
        (ref) => ref.where('category', '==', category)
      );
    }
    return ccCollectn.get().pipe(
      map((querySnapshot) =>
        querySnapshot.docs.map((doc) => {
          const data = doc.data() as CoffeeConversation;
          data.ccId = doc.id;
          data.sanitizedLink = this.sanitizer.bypassSecurityTrustResourceUrl(
            YOUTUBE_EMBED_VIDEO_LINK.replace('VIDEO_ID', data.videoLink)
          );
          return data;
        })
      )
    );
  }

  deleteCoffeeConversation(ccId: string) {
    return from(
      this.adminWriteGuard.assertAdmin().then(() =>
        this.ccCollection.doc(ccId).delete()
      )
    );
  }

  setViewEditModeCoffeeConversation(coffeeConversation: CoffeeConversation) {
    this.viewEditModeCC = { ...coffeeConversation };
  }

  getViewEditModeCoffeeConversation() {
    return this.viewEditModeCC;
  }

  clearViewEditModeCoffeeConversation() {
    this.viewEditModeCC = null;
  }
}
