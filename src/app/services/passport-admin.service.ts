import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { httpsCallable } from 'firebase/functions';
import { firstValueFrom } from 'rxjs';
import { FIREBASE_COLLECTION } from '../app.constants';
import { StampDef } from '../models/Passport';
import { getWiofFunctions } from '../util/cloud-functions.util';

export type StampAction = 'save' | 'publish' | 'retire' | 'reactivate' | 'delete';

export interface StampAuditEntry {
  id: string;
  stampId: string;
  action: StampAction;
  versionBumped: boolean;
  byEmail: string | null;
  at: Date | null;
}

export interface ActionChoice {
  id: string;
  title: string;
  elementIds: string[];
}

/**
 * Admin → Passport (docs/PLANET_PASSPORT_ADMIN_PROPOSAL.md). Reads are
 * Firestore (admins may read drafts and the audit trail, firestore.rules);
 * every change goes through the savePassportStamp function, which checks
 * the admin, validates, versions and audits on the server.
 */
@Injectable({ providedIn: 'root' })
export class PassportAdminService {
  constructor(private firestore: AngularFirestore) {}

  async allDefinitions(): Promise<StampDef[]> {
    const snap = await firstValueFrom(this.firestore.collection<StampDef>(FIREBASE_COLLECTION.PASSPORT_STAMP_DEFS).get());
    return snap.docs.map((d) => ({ ...(d.data() as StampDef), id: d.id })).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async recentChanges(limit = 25): Promise<StampAuditEntry[]> {
    const snap = await firstValueFrom(
      this.firestore.collection('passport_stamp_audit', (ref) => ref.orderBy('at', 'desc').limit(limit)).get()
    );
    return snap.docs.map((d) => {
      const v: any = d.data();
      return { id: d.id, stampId: v.stampId, action: v.action, versionBumped: !!v.versionBumped, byEmail: v.byEmail || null, at: v.at?.toDate ? v.at.toDate() : null };
    });
  }

  /** The Take Action catalogue, for "a specific action" rules. */
  async actions(): Promise<ActionChoice[]> {
    const snap = await firstValueFrom(this.firestore.collection('actions').get());
    return snap.docs
      .map((d) => {
        const v: any = d.data();
        return { id: d.id, title: String(v.title || d.id), elementIds: Array.isArray(v.elementIds) ? v.elementIds : [] };
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  async change(action: StampAction, id: string, def?: Partial<StampDef>): Promise<{ id: string; status: string; version: number | null; versionBumped: boolean }> {
    const call = httpsCallable<{ action: StampAction; id: string; def?: Partial<StampDef> }, any>(getWiofFunctions(), 'savePassportStamp');
    return (await call({ action, id, def })).data;
  }

  /** Earned counts per badge, and "would earn it now" for a badge being edited. */
  async stats(def?: Partial<StampDef>): Promise<{ earned: Record<string, number>; wouldEarn: number | null }> {
    const call = httpsCallable<{ def?: Partial<StampDef> }, any>(getWiofFunctions(), 'passportStampStats');
    return (await call({ def })).data;
  }
}
