import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { from, Observable, of } from 'rxjs';
import { last, map, switchMap } from 'rxjs/operators';
import { Blog } from '../models/Blog';
import { FIREBASE_COLLECTION, AVG_WORD_READ_PER_MIN } from '../app.constants';
import { AdminWriteGuardService } from './admin-write-guard.service';
import { uploadCompressedImage } from '../util/image-compression.util';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  blogCollection: AngularFirestoreCollection<any>;
  private viewEditModeBlog: Blog;

  constructor(
    private storage: AngularFireStorage,
    public database: AngularFirestore,
    private adminWriteGuard: AdminWriteGuardService
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
        querySnapshot.docs
          .map((doc) => {
            const data = doc.data() as Blog;
            data.id = doc.id;
            data.image$ = this.getImage(data.imageName);
            data.contentDelta = (doc.data() as any).contentDelta || null;
            data.timeToRead = this.getTimeToRead(data.content);
            return data;
          })
          // Newest first. Firestore's default doc order isn't a creation-date
          // order, so blog and element pages were showing blogs in a
          // effectively random order. publishDate falls back to submitDate,
          // matching the admin blog list's own "Published" column logic.
          .sort((a, b) => this.blogSortDate(b) - this.blogSortDate(a))
      )
    );
  }

  /**
   * The blog list for cards (element pages, /blogs): reads the small
   * blog_summaries docs (see functions/blog-summary.js) instead of the full
   * blogs, and uses the summary's stored cover URL instead of one
   * getDownloadURL() call per card. Summaries have no `content`, so these
   * Blogs can't be edited or rendered; the admin pages use getBlogs().
   * Falls back to getBlogs() while blog_summaries is still empty (e.g. hosting
   * deployed before the backfill ran), so a list never goes blank.
   */
  getBlogSummaries(category?: string): Observable<Blog[]> {
    const summaries = this.database.collection(
      FIREBASE_COLLECTION.BLOG_SUMMARIES,
      (ref) => (category !== undefined ? ref.where('category', '==', category) : ref)
    );
    return summaries.get().pipe(
      switchMap((querySnapshot) => {
        if (querySnapshot.empty) {
          return this.getBlogs(category);
        }
        return of(
          querySnapshot.docs
            .map((doc) => {
              const data = doc.data() as Blog & { imageUrl?: string };
              data.id = doc.id;
              data.image$ = data.imageUrl ? of(data.imageUrl) : this.getImage(data.imageName);
              return data as Blog;
            })
            .sort((a, b) => this.blogSortDate(b) - this.blogSortDate(a))
        );
      })
    );
  }

  /**
   * Resolves a blog's sortable timestamp: publishDate if set, else
   * submitDate, else 0 (sorts undated legacy docs last).
   */
  private blogSortDate(blog: Blog): number {
    const raw = blog.publishDate || blog.submitDate;
    if (!raw) return 0;
    // Stored as epoch millis (`new Date().getTime()`) in this project's
    // other date fields, but tolerate a Date/Firestore Timestamp too.
    if (typeof raw === 'number') return raw;
    if ((raw as any).toDate) return (raw as any).toDate().getTime();
    return new Date(raw as any).getTime();
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
          data.contentDelta = (querySnapshot.data() as any).contentDelta || null;
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
        data.contentDelta = (doc.data() as any).contentDelta || null;
        data.timeToRead = this.getTimeToRead(data.content);
        return data;
      })
    );
  }

  saveBlogImage(imageData: any, imageName: string): Observable<string> {
    const imagePath = `/${FIREBASE_COLLECTION.BLOG_IMAGE_STORAGE}/${imageName}`;
    const imageRef = this.storage.ref(imagePath);
    return uploadCompressedImage(this.storage, imagePath, imageData).pipe(
      switchMap(() => imageRef.getDownloadURL())
    );
  }

  saveBlogInlineImage(file: File, imageName: string): Observable<string> {
    const imagePath = `/${FIREBASE_COLLECTION.BLOG_IMAGE_STORAGE}/inline/${imageName}`;
    const imageRef = this.storage.ref(imagePath);
    return uploadCompressedImage(this.storage, imagePath, file).pipe(
      switchMap(() => imageRef.getDownloadURL())
    );
  }

  /**
   * Upload inline image and expose upload task + download URL observable
   * Returns an object with `task` (upload task) and `downloadUrl$` observable
   */
  saveBlogInlineImageWithProgress(file: Blob, imageName: string) {
    const imagePath = `/${FIREBASE_COLLECTION.BLOG_IMAGE_STORAGE}/inline/${imageName}`;
    const imageRef = this.storage.ref(imagePath);
    const task = this.storage.upload(imagePath, file);
    const downloadUrl$ = task.snapshotChanges().pipe(
      last(),
      switchMap(() => imageRef.getDownloadURL())
    );
    return { task, downloadUrl$ };
  }

  deleteBlogImage(imageName: string) {
    return this.storage
      .ref(`/${FIREBASE_COLLECTION.BLOG_IMAGE_STORAGE}/${imageName}`)
      .delete();
  }

  saveBlog(blog: Blog) {
    return from(
      this.adminWriteGuard.assertAdmin().then((): any => {
        if (blog.id !== null) {
          return this.blogCollection.doc(blog.id.valueOf()).update({ ...blog });
        } else {
          return this.blogCollection.add({ ...blog });
        }
      })
    );
  }

  deleteBlog(blogId: string) {
    return from(
      this.adminWriteGuard.assertAdmin().then(() =>
        this.blogCollection.doc(blogId).delete()
      )
    );
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
