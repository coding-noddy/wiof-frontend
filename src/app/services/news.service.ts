import { Injectable } from '@angular/core';
import { News } from '../models/News';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { map } from 'rxjs/operators';
import { from, Observable } from 'rxjs';
import { FIREBASE_COLLECTION } from '../app.constants';
import { AdminWriteGuardService } from './admin-write-guard.service';

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  newsCollection: AngularFirestoreCollection<any>;
  viewEditModeNews: News;

  constructor(
    private storage: AngularFireStorage,
    public database: AngularFirestore,
    private adminWriteGuard: AdminWriteGuardService
  ) {
    this.newsCollection = this.database.collection(FIREBASE_COLLECTION.NEWS);
  }
  saveNews(news: News) {
    return from(
      this.adminWriteGuard.assertAdmin().then((): any => {
        if (news.newsId !== null) {
          return this.newsCollection.doc(news.newsId).update({ ...news });
        } else {
          return this.newsCollection.add({ ...news });
        }
      })
    );
  }

  saveNewsImage(imageData: any, imageName: string) {
    const imageUploadTask = this.storage.upload(
      `/${FIREBASE_COLLECTION.NEWS_IMAGE_STORAGE}/${imageName}`,
      imageData
    );
    return from(imageUploadTask);
  }

  getImage(imageName: string): Observable<String> {
    const ref = this.storage.ref(
      `/${FIREBASE_COLLECTION.NEWS_IMAGE_STORAGE}/${imageName}`
    ); //creates reference to storage item using the link in parameter
    return ref.getDownloadURL(); //pulls the download URL which is an observable , handle accordingly
  }

  deleteNewsImage(imageName: string): Observable<String> {
    return this.storage
      .ref(`/${FIREBASE_COLLECTION.NEWS_IMAGE_STORAGE}/${imageName}`)
      .delete();
  }

  getAllNews(): Observable<News[]> {
    return this.newsCollection.get().pipe(
      map((querySnapshot) =>
        querySnapshot.docs.map((doc) => {
          const data = doc.data() as News;
          data.newsId = doc.id;
          if (data.mediaType == 'image') {
            data.image$ = this.getImage(data.mediaLink);
          }
          return data;
        })
      )
    );
  }

  deleteNews(newsId: string) {
    return from(
      this.adminWriteGuard.assertAdmin().then(() =>
        this.newsCollection.doc(newsId).delete()
      )
    );
  }

  setViewEditModeNews(news: News) {
    this.viewEditModeNews = { ...news };
  }

  getViewEditModeNews() {
    return this.viewEditModeNews;
  }

  clearViewEditModeNews() {
    this.viewEditModeNews = null;
  }
}
