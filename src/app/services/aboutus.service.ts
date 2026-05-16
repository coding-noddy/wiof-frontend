import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { from, Observable } from 'rxjs';
import { map,switchMap } from 'rxjs/operators';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { throwError } from 'rxjs';
export interface AboutUsProfile {
  id?: string; // <--- ADDED: Needs to be part of the interface
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
  private viewEditModeProfile: AboutUsProfile;
  constructor(
  private firestore: AngularFirestore,
  private storage: AngularFireStorage

  ) {}

  // --- 1. Fetch all profiles (Modified to include ID) ---
  getAboutUsProfiles(): Observable<AboutUsProfile[]> {
    return this.firestore
      .collection<AboutUsProfile>(this.collectionName, (ref) =>
        ref.orderBy('serialNo', 'asc')
      )
      .snapshotChanges() // <--- CHANGED: from valueChanges to snapshotChanges
      .pipe(
        map((actions) => {
          return actions.map((a) => {
            // Extract the data
            const data = a.payload.doc.data() as AboutUsProfile;
            // Extract the ID
            const id = a.payload.doc.id;
            // Combine them so your frontend gets the ID
            return { id, ...data };
          });
        })
      );
  }

  // --- 2. Add a new profile ---
  addAboutUsProfile(profile: AboutUsProfile): Promise<void> {
    const id = this.firestore.createId();
    // We save the ID inside the document data as well for safety
    return this.firestore
      .collection(this.collectionName)
      .doc(id)
      .set({ ...profile, id });
  }

saveAboutUsProfile(profile: AboutUsProfile): Observable<any> {
  // If we have an ID, we update the existing doc; otherwise, we add a new one.
  let saveObs$;
  if (profile.id) {
    saveObs$ = this.firestore
      .collection(this.collectionName)
      .doc(profile.id)
      .update({ ...profile });
  } else {
    const id = this.firestore.createId();
    saveObs$ = this.firestore
      .collection(this.collectionName)
      .doc(id)
      .set({ ...profile, id });
  }
  return from(saveObs$);
}

saveProfileImage(file: File, fileName: string): Observable<string> {
  // 1. Define constraints
  const maxSizeInBytes = 4 * 1024 * 1024; // 4MB
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];

  // 2. Perform Validations
  if (!allowedTypes.includes(file.type)) {
    return throwError(() => new Error('Invalid file format. Only PNG and JPG are allowed.'));
  }

  if (file.size > maxSizeInBytes) {
    return throwError(() => new Error('File is too large. maximum size allowed is 4MB.'));
  }

  // 3. If valid, proceed with upload
  const path = `about-us/${fileName}`;
  const ref = this.storage.ref(path);
  const task = this.storage.upload(path, file);

  return from(task).pipe(
    switchMap(() => ref.getDownloadURL())
  );
}

  // --- 3. View specific profile (Fixed TS Error) ---
  async viewAboutUsProfile(id: string): Promise<AboutUsProfile | null> {
    // Reference the document using the variable
    const docRef = this.firestore.collection(this.collectionName).doc(id);

    // Fetch snapshot
    const docSnapshot = await docRef.get().toPromise();

    if (docSnapshot && docSnapshot.exists) {
      // <--- FIX: Cast data to 'AboutUsProfile' to avoid 'Spread types' error
      const data = docSnapshot.data() as AboutUsProfile;
      return { id: docSnapshot.id, ...data };
    } else {
      return null;
    }
  }

  // --- 4. Update an existing profile ---
  updateAboutUsProfile(id: string, profile: Partial<AboutUsProfile>): Promise<void> {
    return this.firestore.collection(this.collectionName).doc(id).update(profile);
  }

  setViewEditModeProfile(pollQuestion:AboutUsProfile) {
  this.viewEditModeProfile = {...pollQuestion};
  }

  getViewEditModeProfile() {
  return this.viewEditModeProfile;
  } 

  // --- 5. Delete a profile ---
  deleteAboutUsProfile(profileId: string): Promise<void> {
    console.log('The Document ID being received for delete is:', profileId);
    
    // Check to ensure we don't pass undefined
    if (!profileId) {
        console.error('Error: No Profile ID provided for deletion');
        return Promise.reject('No Profile ID provided');
    }

    return this.firestore.collection(this.collectionName).doc(profileId).delete();
  }
}