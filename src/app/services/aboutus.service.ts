import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

export interface AboutUsProfile {
  serialNo: number;
  name: string;
  imageLink: string;
  bio: string;
  socialLink?: string;
  showKnowMore?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AboutUsService {
  private collectionName = 'AboutUsProfiles';

  constructor(private firestore: AngularFirestore) {}

  // Fetch all profiles
  getAboutUsProfiles(): Observable<AboutUsProfile[]> {
    return this.firestore
      .collection<AboutUsProfile>(this.collectionName, (ref) =>
        ref.orderBy('serialNo', 'asc')
      )
      .valueChanges();
  }

  // Add a new profile
  addAboutUsProfile(profile: AboutUsProfile): Promise<void> {
    const id = this.firestore.createId();
    return this.firestore
      .collection(this.collectionName)
      .doc(id)
      .set({ ...profile, id });
  }

  // Update an existing profile
  updateAboutUsProfile(id: string, profile: Partial<AboutUsProfile>): Promise<void> {
    return this.firestore.collection(this.collectionName).doc(id).update(profile);
  }

  // Delete a profile
  deleteAboutUsProfile(id: string): Promise<void> {
    return this.firestore.collection(this.collectionName).doc(id).delete();
  }
}