import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { combineLatest, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { FIREBASE_COLLECTION } from '../app.constants';
import { ActionItem } from '../models/ActionItem';
import { Blog } from '../models/Blog';
import {
  EXPLORE_LIMITS,
  ExploreGroups,
  ExploreItem,
  groupExploreItems,
  interleave,
  RelatedRef,
  relatedKey,
  RelatedType,
  seededOrder
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
  /** A blog's sub-category: fallback stories on the same topic come first. */
  subCategory?: string;
}

const REVERSE_LIMIT = 6;
// The fallback picks from the element's newest stories and first actions, up to this many each.
const FALLBACK_POOL = 12;

/**
 * Builds the "Explore next" groups for a blog, video, action or calendar
 * occasion (see models/RelatedContent.ts): stories/videos to read and
 * actions to take. Each group: the item's own links, then items that link
 * to it, then the server's similar-content matches, then more from its
 * element. Reads only small docs (related_auto, blog_summaries, actions).
 */
@Injectable({
  providedIn: 'root'
})
export class RelatedContentService {
  constructor(private database: AngularFirestore, private actionService: ActionService) {}

  exploreNext(source: ExploreSource, limits = EXPLORE_LIMITS): Observable<ExploreGroups> {
    const selfKey = source.type && source.id ? relatedKey({ type: source.type, id: source.id }) : null;
    const primary$ = combineLatest([
      this.resolveLinks(source.links || [], source.element),
      selfKey ? this.linkingTo(selfKey, source.element) : of([]),
      this.similarTo(source)
    ]).pipe(map(([forward, reverse, similar]) => [...forward, ...reverse, ...similar]));

    return primary$.pipe(
      switchMap((primary) => {
        const groups = groupExploreItems(selfKey, primary, [], limits);
        const full = groups.read.length === limits.read && groups.act.length === limits.act;
        if (full || !source.element) {
          return of(groups);
        }
        return this.moreFromElement(source.element, selfKey || source.element, source.subCategory).pipe(
          map((fallback) => groupExploreItems(selfKey, primary, fallback, limits))
        );
      }),
      catchError((err) => {
        console.warn('Explore next failed to load:', err);
        return of({ read: [], act: [] });
      })
    );
  }

  /**
   * The server's best keyword matches for a blog or action
   * (related_auto/{type}_{id}, functions/related-content.js), best first.
   * Videos have no doc of their own, so they get none.
   */
  private similarTo(source: ExploreSource): Observable<ExploreItem[]> {
    if (!source.id || (source.type !== 'blog' && source.type !== 'action')) return of([]);
    return this.docOrNull(`${FIREBASE_COLLECTION.RELATED_AUTO}/${source.type}_${source.id}`).pipe(
      switchMap((auto) => {
        // One spare of each, in case a match is also linked or inactive.
        const blogIds: string[] = (auto?.blogs || []).slice(0, EXPLORE_LIMITS.read + 1).map((b: any) => b.id);
        const actionIds: string[] = (auto?.actions || []).slice(0, EXPLORE_LIMITS.act + 1).map((a: any) => a.id);
        if (!blogIds.length && !actionIds.length) return of([]);
        return combineLatest([
          ...blogIds.map((id) =>
            this.docOrNull(`${FIREBASE_COLLECTION.BLOG_SUMMARIES}/${id}`).pipe(map((b) => (b ? this.blogItem(b, 'similar') : null)))
          ),
          ...actionIds.map((id) =>
            this.docOrNull(`${FIREBASE_COLLECTION.ACTIONS}/${id}`).pipe(
              map((a) => (a && a.isActive ? this.actionItem(a, 'similar', source.element) : null))
            )
          )
        ]).pipe(map((items) => items.filter((i): i is ExploreItem => !!i)));
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

  /**
   * Stories and actions from the element, alternating. Each page gets its own
   * selection (seededOrder) from the element's newest stories and first
   * actions, with stories on the same sub-category first, instead of every
   * page showing the same four.
   */
  private moreFromElement(element: string, seed: string, subCategory?: string): Observable<ExploreItem[]> {
    const category = element.charAt(0).toUpperCase() + element.slice(1).toLowerCase();
    const topic = (subCategory || '').trim().toLowerCase();
    const blogs$ = this.database
      .collection(FIREBASE_COLLECTION.BLOG_SUMMARIES, (ref) => ref.where('category', '==', category))
      .get()
      .pipe(
        map((snap) => {
          const all = snap.docs.map((doc) => ({ ...(doc.data() as any), id: doc.id }));
          const sameTopic = topic ? all.filter((b) => String(b.subCategory || '').trim().toLowerCase() === topic) : [];
          const newest = all
            .filter((b) => !sameTopic.includes(b))
            .sort((a, b) => Blog.sortDate(b) - Blog.sortDate(a))
            .slice(0, FALLBACK_POOL);
          const byKey = (b: any) => `blog:${b.id}`;
          return [...seededOrder(sameTopic, seed, byKey), ...seededOrder(newest, seed, byKey)]
            .slice(0, 5)
            .map((blog) => this.blogItem(blog, 'element'));
        })
      );
    const actions$ = this.actionService
      .getActionsForElement(element, FALLBACK_POOL)
      .pipe(
        map((actions) =>
          seededOrder(actions, seed, (a) => `action:${a.id}`)
            .slice(0, 5)
            .map((a) => this.actionItem(a, 'element', element))
        )
      );
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
