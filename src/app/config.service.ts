import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FIREBASE_COLLECTION } from './app.constants';

export interface Config {
  file: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  constructor(private database: AngularFirestore) {}

  getConfig(file: string): Observable<Config[]> {
    return this.database
      .collection<Config>(FIREBASE_COLLECTION.CONFIG, ref => ref.where('file', '==', file))
      .valueChanges()
      .pipe(
        catchError((error) => {
          console.error('Error loading config', error);
          return of([]);
        })
      );
  }
}
