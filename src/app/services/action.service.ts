import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { ActionItem } from '../models/ActionItem';
import { FIREBASE_COLLECTION } from '../app.constants';
import { AdminWriteGuardService } from './admin-write-guard.service';

@Injectable({
  providedIn: 'root'
})
export class ActionService {
  actionCollection: AngularFirestoreCollection<any>;
  private viewEditModeAction: ActionItem;

  constructor(
    public database: AngularFirestore,
    private adminWriteGuard: AdminWriteGuardService
  ) {
    this.actionCollection = this.database.collection(FIREBASE_COLLECTION.ACTIONS);
  }

  /**
   * Active actions for the public catalogue, ordered for display.
   */
  getActiveActions(): Observable<ActionItem[]> {
    return this.database
      .collection(FIREBASE_COLLECTION.ACTIONS, (ref) =>
        ref.where('isActive', '==', true).orderBy('displayOrder', 'asc')
      )
      .get()
      .pipe(map((querySnapshot) => this.mapActions(querySnapshot)));
  }

  /**
   * Active actions tagged to a given element, for the Element page teaser
   * and contextual sections (Section 13: show 2-4 relevant actions).
   */
  getActionsForElement(element: string, max = 4): Observable<ActionItem[]> {
    return this.database
      .collection(FIREBASE_COLLECTION.ACTIONS, (ref) =>
        ref
          .where('isActive', '==', true)
          .where('elementIds', 'array-contains', element)
          .orderBy('displayOrder', 'asc')
          .limit(max)
      )
      .get()
      .pipe(map((querySnapshot) => this.mapActions(querySnapshot)));
  }

  /**
   * All actions regardless of active status, for the Admin list.
   */
  getAllActions(): Observable<ActionItem[]> {
    return this.database
      .collection(FIREBASE_COLLECTION.ACTIONS, (ref) =>
        ref.orderBy('displayOrder', 'asc')
      )
      .get()
      .pipe(map((querySnapshot) => this.mapActions(querySnapshot)));
  }

  getAction(id: string): Observable<ActionItem> {
    return this.database
      .doc<ActionItem>(`${FIREBASE_COLLECTION.ACTIONS}/${id}`)
      .get()
      .pipe(
        map((docSnapshot) => {
          if (!docSnapshot.exists) {
            return null;
          }
          const data = docSnapshot.data() as ActionItem;
          data.id = docSnapshot.id;
          return data;
        })
      );
  }

  private mapActions(querySnapshot: firebase.firestore.QuerySnapshot): ActionItem[] {
    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as ActionItem;
      data.id = doc.id;
      return data;
    });
  }

  /**
   * Creates or updates an action. Admin-only, enforced client-side here as
   * defense-in-depth and server-side by firestore.rules' isAdmin() check.
   */
  saveAction(action: ActionItem) {
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    return from(
      this.adminWriteGuard.assertAdmin().then((): any => {
        if (action.id) {
          const { id, ...data } = action;
          return this.actionCollection.doc(id).update({
            ...data,
            updatedAt: timestamp,
            // Bumps on every edit (increment treats a missing field as 0,
            // so an action's first edit after this feature shipped starts
            // it at 1 — no backfill needed). Placed after the spread so it
            // always wins over whatever stale `version` the edit form's
            // own ActionItem object happened to carry.
            version: firebase.firestore.FieldValue.increment(1)
          });
        } else {
          const { id, ...data } = action;
          return this.actionCollection.add({
            ...data,
            createdAt: timestamp,
            updatedAt: timestamp,
            version: 1
          });
        }
      })
    );
  }

  /**
   * Soft-deactivate only — an action with existing user_actions history must
   * never be hard-deleted (Section 10: "avoid deleting actions that already
   * have user history"), unlike Blog which does a real delete.
   */
  deactivateAction(actionId: string) {
    return from(
      this.adminWriteGuard.assertAdmin().then(() =>
        this.actionCollection.doc(actionId).update({
          isActive: false,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
      )
    );
  }

  setViewEditModeAction(action: ActionItem) {
    this.viewEditModeAction = { ...action };
  }

  getViewEditModeAction() {
    return this.viewEditModeAction;
  }

  clearViewEditModeAction() {
    this.viewEditModeAction = null;
  }
}
