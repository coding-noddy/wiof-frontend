import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  DocumentSnapshot
} from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
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
   * Deterministic document ID for a user's saved-content record. Using
   * `{userId}_{contentId}` instead of a random auto-ID means a concurrent
   * double-click can't create two documents for the same save, and lookups/
   * deletes are a direct doc reference instead of a query — see Foundation
   * Hardening Plan v4 §9. Existing docs created under the old random-ID
   * scheme are migrated by the migrateSavedContentIds Cloud Function
   * (scripts/migrate-saved-content-ids.js runs it once per environment).
   */
  private docId(userId: string, contentId: string): string {
    return `${userId}_${contentId}`;
  }

  /**
   * Save a content item for the user. Idempotent: saving already-saved
   * content is a no-op rather than creating a duplicate document.
   */
  async saveContent(item: SaveContentInput): Promise<void> {
    const ref = this.firestore.firestore
      .collection(FIREBASE_COLLECTION.USER_SAVED_CONTENT)
      .doc(this.docId(item.userId, item.contentId));

    const existing = await ref.get();
    if (existing.exists) {
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

    await ref.set(doc);
  }

  /**
   * Remove a saved content item for the user — a direct doc delete by the
   * deterministic ID rather than a query-then-delete.
   */
  async unsaveContent(userId: string, contentId: string): Promise<void> {
    await this.firestore.firestore
      .collection(FIREBASE_COLLECTION.USER_SAVED_CONTENT)
      .doc(this.docId(userId, contentId))
      .delete();
  }

  /**
   * Returns an Observable<boolean> indicating whether the content is saved for the user.
   * Uses valueChanges (real-time) so the UI stays in sync.
   */
  isContentSaved(userId: string, contentId: string): Observable<boolean> {
    return this.firestore
      .collection(FIREBASE_COLLECTION.USER_SAVED_CONTENT)
      .doc<SavedContentDocument>(this.docId(userId, contentId))
      .valueChanges()
      .pipe(map(doc => !!doc));
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
