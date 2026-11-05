import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { combineLatest, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { FIREBASE_COLLECTION } from '../app.constants';
import { ActionItem } from '../models/ActionItem';
import { ElementSlug } from '../models/Journey';
import {
  NEXT_FOR_YOU_LIMITS,
  NEXT_FOR_YOU_RECENT_READS,
  NextForYou,
  NextForYouInput,
  pickNextForYou,
  RecentRead
} from '../models/NextForYou';
import { ExploreItem } from '../models/RelatedContent';
import { UserAction } from '../models/UserAction';
import { QualityReadEntry } from '../models/engagement-history';
import { RelatedContentService } from './related-content.service';

/** What the home journey panel has already loaded for the user. */
export interface NextForYouSource {
  elements: ElementSlug[];
  /** Newest first. */
  reads: QualityReadEntry[];
  /** In the Take Action order. */
  activeActions: ActionItem[];
  /** Newest first. */
  actionHistory: UserAction[];
}

// Similar stories looked at per recent read, and newest stories per element.
const SIMILAR_PER_READ = 4;
const NEWEST_PER_ELEMENT = 6;

/**
 * Gathers what "Next for you" picks from (models/NextForYou.ts). Builds on
 * the data the journey panel already has (reads, active actions, action
 * history), so actions cost no extra reads. Stories: the server's similar
 * content for the last few reads (related_auto), and the newest stories in
 * each element only if those don't fill the list.
 */
@Injectable({
  providedIn: 'root'
})
export class NextForYouService {
  constructor(
    private database: AngularFirestore,
    private relatedContent: RelatedContentService
  ) {}

  nextForYou(source: NextForYouSource): Observable<NextForYou> {
    const empty: NextForYou = { read: [], act: [], elements: source.elements };
    if (!source.elements.length) return of(empty);

    const byId = new Map(source.activeActions.map((a) => [a.id, a]));
    const action = (a: ActionItem) => this.relatedContent.actionItem(a, 'element', a.elementIds?.find((e) => source.elements.includes(e as ElementSlug)));
    const base: NextForYouInput = {
      elements: source.elements,
      readIds: new Set(source.reads.map((r) => r.contentId).filter(Boolean)),
      doneActionIds: new Set(source.actionHistory.filter((h) => h.status === 'COMPLETE').map((h) => h.actionId)),
      started: source.actionHistory
        .filter((h) => h.status === 'IN_PROGRESS' && byId.has(h.actionId))
        .map((h) => action(byId.get(h.actionId)!)),
      recentReads: [],
      newestByElement: {},
      actionsByElement: Object.fromEntries(
        source.elements.map((slug) => [slug, source.activeActions.filter((a) => (a.elementIds || []).includes(slug)).map(action)])
      )
    };

    const recent = [...new Map(source.reads.filter((r) => r.contentId).map((r) => [r.contentId, r])).values()].slice(0, NEXT_FOR_YOU_RECENT_READS);
    return (recent.length ? combineLatest(recent.map((r) => this.recentRead(r, byId, action))) : of([])).pipe(
      switchMap((reads) => {
        const recentReads = reads.filter((r): r is RecentRead & { ids: string[] } => !!r);
        // A read records the story's slug or ID; know both, so neither shows again.
        recentReads.forEach((r) => r.ids.forEach((id) => base.readIds.add(id)));
        const input = { ...base, recentReads };
        const picks = pickNextForYou(input);
        if (picks.read.length >= NEXT_FOR_YOU_LIMITS.read || picks.read.length + picks.act.length >= NEXT_FOR_YOU_LIMITS.total) {
          return of(picks);
        }
        return this.newestByElement(source.elements).pipe(map((newestByElement) => pickNextForYou({ ...input, newestByElement })));
      }),
      catchError((err) => {
        console.warn('Next for you failed to load:', err);
        return of(empty);
      })
    );
  }

  /** A read story's similar stories and actions (related_auto/blog_{id}); null if the story is gone. */
  private recentRead(
    read: QualityReadEntry,
    actionsById: Map<string, ActionItem>,
    action: (a: ActionItem) => ExploreItem
  ): Observable<(RecentRead & { ids: string[] }) | null> {
    return this.summaryOf(read.contentId).pipe(
      switchMap((story) => {
        if (!story) return of(null);
        return this.docOrNull(`${FIREBASE_COLLECTION.RELATED_AUTO}/blog_${story.id}`).pipe(
          switchMap((auto) => {
            const blogIds: string[] = (auto?.blogs || []).slice(0, SIMILAR_PER_READ).map((b: any) => b.id);
            const actions = (auto?.actions || [])
              .map((a: any) => actionsById.get(a.id))
              .filter((a: ActionItem | undefined): a is ActionItem => !!a)
              .map(action);
            const blogs$ = blogIds.length
              ? combineLatest(blogIds.map((id) => this.docOrNull(`${FIREBASE_COLLECTION.BLOG_SUMMARIES}/${id}`)))
              : of([]);
            return blogs$.pipe(
              map((summaries) => ({
                title: story.title || read.blogTitle,
                ids: [story.id, story.slug].filter(Boolean),
                blogs: summaries.filter(Boolean).map((b) => this.relatedContent.blogItem(b, 'similar')),
                actions
              }))
            );
          })
        );
      })
    );
  }

  /** The newest stories in each element (index: category + publishDate desc). */
  private newestByElement(elements: ElementSlug[]): Observable<Partial<Record<ElementSlug, ExploreItem[]>>> {
    return combineLatest(
      elements.map((slug) =>
        this.database
          .collection(FIREBASE_COLLECTION.BLOG_SUMMARIES, (ref) =>
            ref.where('category', '==', slug.charAt(0).toUpperCase() + slug.slice(1)).orderBy('publishDate', 'desc').limit(NEWEST_PER_ELEMENT)
          )
          .get()
          .pipe(
            map((snap) => snap.docs.map((doc) => this.relatedContent.blogItem({ ...(doc.data() as any), id: doc.id }, 'element'))),
            catchError(() => of([] as ExploreItem[]))
          )
      )
    ).pipe(map((lists) => Object.fromEntries(elements.map((slug, i) => [slug, lists[i]]))));
  }

  /** A story's summary from its ID or its slug (a read records either). */
  private summaryOf(slugOrId: string): Observable<any | null> {
    return this.docOrNull(`${FIREBASE_COLLECTION.BLOG_SUMMARIES}/${slugOrId}`).pipe(
      switchMap((doc) =>
        doc
          ? of(doc)
          : this.database
              .collection(FIREBASE_COLLECTION.BLOG_SUMMARIES, (ref) => ref.where('slug', '==', slugOrId).limit(1))
              .get()
              .pipe(
                map((snap) => (snap.docs.length ? { ...(snap.docs[0].data() as any), id: snap.docs[0].id } : null)),
                catchError(() => of(null))
              )
      )
    );
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
}
