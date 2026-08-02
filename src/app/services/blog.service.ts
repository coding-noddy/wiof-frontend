import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Blog } from '../models/Blog';
import { FIREBASE_COLLECTION, AVG_WORD_READ_PER_MIN } from '../app.constants';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  blogCollection: AngularFirestoreCollection<any>;
  private viewEditModeBlog: Blog;

  constructor(
    private storage: AngularFireStorage,
    public database: AngularFirestore
  ) {
    this.blogCollection = this.database.collection(FIREBASE_COLLECTION.BLOGS);
  }

  // function to pull Images from firebase storage using image link stored in firestore in each blog
  getImage(image: string): Observable<string> {
    const ref = this.storage.ref(
      `/${FIREBASE_COLLECTION.BLOG_IMAGE_STORAGE}/${image}`
    ); //creates reference to storage item using the link in parameter
    return ref.getDownloadURL(); //pulls the download URL which is an observable , handle accordingly
  }

  getBlogs(category?: string): Observable<Blog[]> {
    let blogCollectn = this.database.collection(FIREBASE_COLLECTION.BLOGS);
    if (category !== undefined) {
      blogCollectn = this.database.collection(
        FIREBASE_COLLECTION.BLOGS,
        (ref) => ref.where('category', '==', category)
      );
    }
    return blogCollectn.get().pipe(
      map((querySnapshot) =>
        querySnapshot.docs.map((doc) => {
          const data = doc.data() as Blog;
          data.id = doc.id;
          data.image$ = this.getImage(data.imageName);
          data.timeToRead = this.getTimeToRead(data.content);
          return data;
        })
      )
    );
  }

  getTimeToRead(content: string): number {
    const totalWords = content.split(' ').length;
    return Math.ceil(totalWords / AVG_WORD_READ_PER_MIN);
  }

  getBlog(id: string): Observable<Blog> {
    const blogDoc = this.database.doc<Blog>(
      `${FIREBASE_COLLECTION.BLOGS}/${id}`
    );
    return blogDoc.get().pipe(
      map((querySnapshot) => {
        if (!querySnapshot.exists) {
          return null;
        } else {
          const data = querySnapshot.data();
          data.id = querySnapshot.id;
          data.image$ = this.getImage(data.imageName);
          data.timeToRead = this.getTimeToRead(data.content);
          return data;
        }
      })
    );
  }

  getBlogBySlug(slug: string): Observable<Blog> {
    const blogCollection = this.database.collection(
      FIREBASE_COLLECTION.BLOGS,
      (ref) => ref.where('slug', '==', slug).limit(1)
    );
    return blogCollection.get().pipe(
      map((querySnapshot) => {
        if (querySnapshot.docs.length === 0) return null;
        const doc = querySnapshot.docs[0];
        const data = doc.data() as Blog;
        data.id = doc.id;
        data.image$ = this.getImage(data.imageName);
        data.timeToRead = this.getTimeToRead(data.content);
        return data;
      })
    );
  }

  saveBlogImage(imageData: any, imageName: string) {
    const imageUploadTask = this.storage.upload(
      `/${FIREBASE_COLLECTION.BLOG_IMAGE_STORAGE}/${imageName}`,
      imageData
    );
    return from(imageUploadTask);
  }

  deleteBlogImage(imageName: string) {
    return this.storage
      .ref(`/${FIREBASE_COLLECTION.BLOG_IMAGE_STORAGE}/${imageName}`)
      .delete();
  }

  saveBlog(blog: Blog) {
    let saveBlog$ = null;
    if (blog.id !== null) {
      saveBlog$ = this.blogCollection.doc(blog.id.valueOf()).update({
        ...blog
      });
    } else {
      saveBlog$ = this.blogCollection.add({ ...blog });
    }
    return from(saveBlog$);
  }

  deleteBlog(blogId: string) {
    return from(this.blogCollection.doc(blogId).delete());
  }

  setViewEditModeBlog(pollQuestion: Blog) {
    this.viewEditModeBlog = { ...pollQuestion };
  }

  getViewEditModeBlog() {
    return this.viewEditModeBlog;
  }

  clearViewEditModeBlog() {
    this.viewEditModeBlog = null;
  }
}
