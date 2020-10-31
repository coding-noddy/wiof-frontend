import { Injectable } from "@angular/core";
import { News } from "../models/News";
import {
  AngularFirestore,
  AngularFirestoreCollection,
} from "@angular/fire/firestore";
import { AngularFireStorage } from "@angular/fire/storage";
import { map } from "rxjs/operators";
import { from, Observable } from "rxjs";
import { FIREBASE_COLLECTION } from "../app.constants";

@Injectable({
  providedIn: "root",
})
export class NewsService {
  newsCollection: AngularFirestoreCollection<any>;
  viewEditModeNews: News;

  constructor(
    private storage: AngularFireStorage,
    public database: AngularFirestore
  ) {
    this.newsCollection = this.database.collection(FIREBASE_COLLECTION.NEWS);
  }
  saveNews(news: News) {
    let saveNews$ = null;
    if (news.newsId !== null) {
      saveNews$ = this.newsCollection.doc(news.newsId).update({
        ...news,
      });
    } else {
      saveNews$ = this.newsCollection.add({ ...news });
    }
    return from(saveNews$);
  }

  saveNewsImage(imageData: any, imageName: String) {
    const imageUploadTask = this.storage.upload(
      `/${FIREBASE_COLLECTION.NEWS_IMAGE_STORAGE}/${imageName}`,
      imageData
    );
    return from(imageUploadTask);
  }

  getImage(imageName: String): Observable<String> {
    const ref = this.storage.ref(
      `/${FIREBASE_COLLECTION.NEWS_IMAGE_STORAGE}/${imageName}`
    ); //creates reference to storage item using the link in parameter
    return ref.getDownloadURL(); //pulls the download URL which is an observable , handle accordingly
  }

  getAllNews(): Observable<News[]> {
    return this.newsCollection.get().pipe(
      map((querySnapshot) =>
        querySnapshot.docs.map((doc) => {
          const data = doc.data() as News;
          data.newsId = doc.id;
          if (data.mediaType == "image") {
            data.imageLink = this.getImage(data.mediaLink);
          }
          return data;
        })
      )
    );
  }

  deleteNews(newsId: string) {
    return from(this.newsCollection.doc(newsId).delete());
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
