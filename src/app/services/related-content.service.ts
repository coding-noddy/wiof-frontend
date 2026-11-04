import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { combineLatest, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { FIREBASE_COLLECTION } from '../app.constants';
import { ActionItem } from '../models/ActionItem';
import { Blog } from '../models/Blog';
import {
  ExploreItem,
  interleave,
  mergeExploreItems,
  RelatedRef,
  relatedKey,
  RelatedType
} from '../models/RelatedContent';
import { ActionService } from './action.service';

/** The item an "Explore next" block is shown on. */
export interface ExploreSource {
  /** Omit for a calendar occasion, which nothing links back to. */
  type?: RelatedType;
  id?: string;
  /** The item's own admin links. */
  links?: RelatedRef[] | null;
  /** Element for the "more from this element" fallback; none means no fallback. */
  element?: string;
}

const REVERSE_LIMIT = 6;

/**
 * Builds the "Explore next" cards for a blog, video, action or calendar
 * occasion (see models/RelatedContent.ts): the item's own links, then items
 * that link to it, then more from its element. Reads only small docs
 * (blog_summaries, actions); videos need no read at all.
 */
@Injectable({
  providedIn: 'root'
})
export class RelatedContentService {
  constructor(private database: AngularFirestore, private actionService: ActionService) {}

  exploreNext(source: ExploreSource, max = 4): Observable<ExploreItem[]> {
    const selfKey = source.type && source.id ? relatedKey({ type: source.type, id: source.id }) : null;
    const linked$ = combineLatest([
      this.resolveLinks(source.links || [], source.element),
      selfKey ? this.linkingTo(selfKey, source.element) : of([])
    ]).pipe(map(([forward, reverse]) => [...forward, ...reverse]));

    return linked$.pipe(
      switchMap((linked) => {
        const enough = mergeExploreItems(selfKey, linked, [], max).length === max;
        if (enough || !source.element) {
          return of(mergeExploreItems(selfKey, linked, [], max));
        }
        return this.moreFromElement(source.element).pipe(
          map((fallback) => mergeExploreItems(selfKey, linked, fallback, max))
        );
      }),
      catchError((err) => {
        console.warn('Explore next failed to load:', err);
        return of([]);
      })
    );
  }

  /** An item's own links, in the admin's order; deleted or inactive targets drop out. */
  private resolveLinks(links: RelatedRef[], element?: string): Observable<ExploreItem[]> {
    if (!links.length) return of([]);
    return combineLatest(
      links.map((ref) => {
        switch (ref.type) {
          case 'video':
            return of(this.videoItem(ref, element));
          case 'blog':
            return this.docOrNull(`${FIREBASE_COLLECTION.BLOG_SUMMARIES}/${ref.id}`).pipe(
              map((blog) => (blog ? this.blogItem(blog, 'linked') : null))
            );
          case 'action':
            return this.docOrNull(`${FIREBASE_COLLECTION.ACTIONS}/${ref.id}`).pipe(
              map((action) => (action && action.isActive ? this.actionItem(action, 'linked', element) : null))
            );
          default:
            return of(null);
        }
      })
    ).pipe(map((items) => items.filter((i): i is ExploreItem => !!i)));
  }

  /** Blogs and active actions whose admin linked them to `key`. */
  private linkingTo(key: string, element?: string): Observable<ExploreItem[]> {
    const query = (collection: string) =>
      this.database
        .collection(collection, (ref) => ref.where('relatedKeys', 'array-contains', key).limit(REVERSE_LIMIT))
        .get()
        .pipe(map((snap) => snap.docs.map((doc) => ({ ...(doc.data() as any), id: doc.id }))));
    return combineLatest([query(FIREBASE_COLLECTION.BLOG_SUMMARIES), query(FIREBASE_COLLECTION.ACTIONS)]).pipe(
      map(([blogs, actions]) => [
        ...blogs.map((blog) => this.blogItem(blog, 'linked')),
        ...actions.filter((a) => a.isActive).map((a) => this.actionItem(a, 'linked', element))
      ])
    );
  }

  /** Newest stories and first actions of the element, alternating. */
  private moreFromElement(element: string): Observable<ExploreItem[]> {
    const category = element.charAt(0).toUpperCase() + element.slice(1).toLowerCase();
    const blogs$ = this.database
      .collection(FIREBASE_COLLECTION.BLOG_SUMMARIES, (ref) => ref.where('category', '==', category))
      .get()
      .pipe(
        map((snap) =>
          snap.docs
            .map((doc) => ({ ...(doc.data() as any), id: doc.id }))
            .sort((a, b) => Blog.sortDate(b) - Blog.sortDate(a))
            .slice(0, 4)
            .map((blog) => this.blogItem(blog, 'element'))
        )
      );
    const actions$ = this.actionService
      .getActionsForElement(element, 4)
      .pipe(map((actions) => actions.map((a) => this.actionItem(a, 'element', element))));
    return combineLatest([blogs$, actions$]).pipe(map(([blogs, actions]) => interleave(blogs, actions)));
  }

  private docOrNull(path: string): Observable<any | null> {
    return this.database
      .doc(path)
      .get()
      .pipe(
        map((snap) => (snap.exists ? { ...(snap.data() as any), id: snap.id } : null)),
        catchError(() => of(null))
      );
  }

  private blogItem(blog: any, reason: ExploreItem['reason']): ExploreItem {
    return {
      type: 'blog',
      id: blog.id,
      title: blog.title,
      image: blog.imageUrl || null,
      icon: 'book-outline',
      link: ['/element', String(blog.category || '').toLowerCase(), 'blog', blog.slug || blog.id],
      reason
    };
  }

  private actionItem(action: ActionItem, reason: ExploreItem['reason'], element?: string): ExploreItem {
    const actionElement = (action.elementIds || []).includes(element) ? element : action.elementIds?.[0] || element;
    return {
      type: 'action',
      id: action.id,
      title: action.title,
      image: null,
      icon: action.iconName || 'leaf-outline',
      link: ['/element', actionElement, 'take-action'],
      queryParams: { action: action.id },
      reason
    };
  }

  private videoItem(ref: RelatedRef, element?: string): ExploreItem {
    return {
      type: 'video',
      id: ref.id,
      title: ref.title,
      image: `https://i.ytimg.com/vi/${ref.id}/mqdefault.jpg`,
      icon: 'play-circle-outline',
      link: ['/element', ref.element || element, 'video', ref.id],
      reason: 'linked'
    };
  }
}
