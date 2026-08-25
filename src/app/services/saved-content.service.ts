import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  DocumentSnapshot
} from '@angular/fire/compat/firestore';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { FIREBASE_COLLECTION } from '../app.constants';

export interface SavedContentDocument {
  id?: string;
  userId: string;
  contentId: string;
  contentType: 'blog' | 'video';
  contentTitle: string;
  contentThumbnail: string;
  savedAt: any;
}

export interface SaveContentInput {
  userId: string;
  contentId: string;
  contentType: 'blog' | 'video';
  contentTitle: string;
  contentThumbnail: string;
}

export interface PaginatedResult<T> {
  items: T[];
  lastDoc: DocumentSnapshot<T> | null;
  hasMore: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SavedContentService {
  private readonly MAX_PAGE_SIZE = 20;

  constructor(private firestore: AngularFirestore) {}

  /**
   * Save a content item for the user.
   * Enforces one document per userId + contentId pair by checking for existing docs first.
   */
  async saveContent(item: SaveContentInput): Promise<void> {
    // Check if already saved (enforce unique constraint: one doc per userId + contentId)
    const existing = await firstValueFrom(
      this.firestore
        .collection<SavedContentDocument>(FIREBASE_COLLECTION.USER_SAVED_CONTENT, ref =>
          ref
            .where('userId', '==', item.userId)
            .where('contentId', '==', item.contentId)
            .limit(1)
        )
        .get()
    );

    if (existing && !existing.empty) {
      // Already saved — no-op to enforce uniqueness
      return;
    }

    const doc: Omit<SavedContentDocument, 'id'> = {
      userId: item.userId,
      contentId: item.contentId,
      contentType: item.contentType,
      contentTitle: item.contentTitle,
      contentThumbnail: item.contentThumbnail,
      savedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await this.firestore
      .collection(FIREBASE_COLLECTION.USER_SAVED_CONTENT)
      .add(doc);
  }

  /**
   * Remove a saved content item for the user.
   * Deletes the matching document by userId + contentId.
   */
  async unsaveContent(userId: string, contentId: string): Promise<void> {
    const snapshot = await firstValueFrom(
      this.firestore
        .collection<SavedContentDocument>(FIREBASE_COLLECTION.USER_SAVED_CONTENT, ref =>
          ref
            .where('userId', '==', userId)
            .where('contentId', '==', contentId)
            .limit(1)
        )
        .get()
    );

    if (snapshot && !snapshot.empty) {
      const docId = snapshot.docs[0].id;
      await this.firestore
        .collection(FIREBASE_COLLECTION.USER_SAVED_CONTENT)
        .doc(docId)
        .delete();
    }
  }

  /**
   * Returns an Observable<boolean> indicating whether the content is saved for the user.
   * Uses valueChanges (real-time) so the UI stays in sync.
   */
  isContentSaved(userId: string, contentId: string): Observable<boolean> {
    return this.firestore
      .collection<SavedContentDocument>(FIREBASE_COLLECTION.USER_SAVED_CONTENT, ref =>
        ref
          .where('userId', '==', userId)
          .where('contentId', '==', contentId)
          .limit(1)
      )
      .valueChanges()
      .pipe(map(docs => docs.length > 0));
  }

  /**
   * Returns paginated saved content for a user, ordered by savedAt descending.
   * Enforces a maximum page size of 20.
   */
  getSavedContent(
    userId: string,
    pageSize: number,
    lastDoc?: DocumentSnapshot<SavedContentDocument>
  ): Observable<PaginatedResult<SavedContentDocument>> {
    const effectivePageSize = Math.min(pageSize, this.MAX_PAGE_SIZE);

    return this.firestore
      .collection<SavedContentDocument>(FIREBASE_COLLECTION.USER_SAVED_CONTENT, ref => {
        let query = ref
          .where('userId', '==', userId)
          .orderBy('savedAt', 'desc')
          .limit(effectivePageSize + 1); // Fetch one extra to determine hasMore

        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }

        return query;
      })
      .get()
      .pipe(
        map(snapshot => {
          const docs = snapshot.docs;
          const hasMore = docs.length > effectivePageSize;
          const resultDocs = hasMore ? docs.slice(0, effectivePageSize) : docs;

          const items: SavedContentDocument[] = resultDocs.map(doc => {
            const data = doc.data() as SavedContentDocument;
            return { ...data, id: doc.id };
          });

          const lastDocument = resultDocs.length > 0
            ? resultDocs[resultDocs.length - 1] as unknown as DocumentSnapshot<SavedContentDocument>
            : null;

          return {
            items,
            lastDoc: lastDocument,
            hasMore
          };
        })
      );
  }

  /**
   * Returns an Observable<Set<string>> of all saved content IDs for a user.
   * Useful for efficient lookup of bookmark state across multiple items.
   */
  getSavedContentIds(userId: string): Observable<Set<string>> {
    return this.firestore
      .collection<SavedContentDocument>(FIREBASE_COLLECTION.USER_SAVED_CONTENT, ref =>
        ref.where('userId', '==', userId)
      )
      .valueChanges()
      .pipe(
        map(docs => new Set(docs.map(doc => doc.contentId)))
      );
  }
}
