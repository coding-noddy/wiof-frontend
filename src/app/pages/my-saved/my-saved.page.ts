import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Observable, of } from 'rxjs';
import { takeUntil, catchError, first } from 'rxjs/operators';
import { DocumentSnapshot } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';
import {
  SavedContentService,
  SavedContentDocument
} from 'src/app/services/saved-content.service';

@Component({
  selector: 'app-my-saved',
  templateUrl: './my-saved.page.html',
  styleUrls: ['./my-saved.page.scss']
})
export class MySavedPage implements OnInit, OnDestroy, ViewWillEnter {
  savedItems: SavedContentDocument[] = [];
  isLoading = true;
  hasMore = false;
  isLoadingMore = false;
  errorMessage: string | null = null;

  private userId: string | null = null;
  private lastDoc: DocumentSnapshot<SavedContentDocument> | null = null;
  private readonly pageSize = 20;
  private destroy$ = new Subject<void>();

  /** Confirmation modal state */
  showConfirmModal = false;
  itemToRemove: SavedContentDocument | null = null;
  isRemoving = false;

  /** Cache of resolved image URLs */
  imageUrls: Record<string, Observable<string>> = {};

  constructor(
    private authService: AuthService,
    private savedContentService: SavedContentService,
    private storage: AngularFireStorage
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.userId = user.uid;
        }
      });
  }

  ionViewWillEnter(): void {
    // Refresh saved content every time the page is shown
    if (this.userId) {
      this.loadSavedContent();
    } else {
      // Wait for user to be available
      this.authService.currentUser$
        .pipe(first(u => u !== null), takeUntil(this.destroy$))
        .subscribe(user => {
          if (user) {
            this.userId = user.uid;
            this.loadSavedContent();
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSavedContent(): void {
    if (!this.userId) return;

    this.isLoading = true;
    this.errorMessage = null;
    this.savedItems = [];
    this.lastDoc = null;

    this.savedContentService
      .getSavedContent(this.userId, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.savedItems = result.items;
          this.lastDoc = result.lastDoc;
          this.hasMore = result.hasMore;
          this.isLoading = false;
        },
        error: err => {
          console.error('Failed to load saved content:', err);
          this.errorMessage = 'Could not load your saved content. Please try again.';
          this.isLoading = false;
        }
      });
  }

  loadMore(): void {
    if (!this.userId || !this.lastDoc || this.isLoadingMore) return;

    this.isLoadingMore = true;

    this.savedContentService
      .getSavedContent(this.userId, this.pageSize, this.lastDoc)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.savedItems = [...this.savedItems, ...result.items];
          this.lastDoc = result.lastDoc;
          this.hasMore = result.hasMore;
          this.isLoadingMore = false;
        },
        error: err => {
          console.error('Failed to load more saved content:', err);
          this.isLoadingMore = false;
        }
      });
  }

  getContentRoute(item: SavedContentDocument): string[] {
    if (item.contentType === 'blog') {
      return ['/element', 'earth', 'blog', item.contentId];
    }
    return ['/element', 'earth', 'video', item.contentId];
  }

  retry(): void {
    this.loadSavedContent();
  }

  /**
   * Gets the resolved image URL for a saved content item.
   * Blog images are stored in Firebase Storage under 'blog-images/{imageName}'.
   * Video thumbnails are already full URLs (YouTube).
   */
  getImageUrl(item: SavedContentDocument): Observable<string> {
    if (!item.contentThumbnail) {
      return of('');
    }

    // If it's already a full URL (videos use YouTube thumbnail URLs), use directly
    if (item.contentThumbnail.startsWith('http')) {
      return of(item.contentThumbnail);
    }

    // Cache the observable so we don't re-request on each change detection
    const cacheKey = item.contentId;
    if (!this.imageUrls[cacheKey]) {
      const storagePath = item.contentType === 'blog'
        ? `blog-images/${item.contentThumbnail}`
        : item.contentThumbnail;

      this.imageUrls[cacheKey] = this.storage.ref(storagePath).getDownloadURL().pipe(
        catchError(() => of(''))
      );
    }
    return this.imageUrls[cacheKey];
  }

  /**
   * Shows the confirmation modal for removing a saved item.
   */
  confirmRemove(item: SavedContentDocument): void {
    this.itemToRemove = item;
    this.showConfirmModal = true;
  }

  /**
   * Cancels the removal and hides the modal.
   */
  cancelRemove(): void {
    this.showConfirmModal = false;
    this.itemToRemove = null;
  }

  /**
   * Removes the item from saved content after confirmation.
   */
  async removeItem(): Promise<void> {
    if (!this.itemToRemove || !this.userId) return;

    this.isRemoving = true;
    try {
      await this.savedContentService.unsaveContent(this.userId, this.itemToRemove.contentId);
      // Remove from local list
      this.savedItems = this.savedItems.filter(i => i.contentId !== this.itemToRemove!.contentId);
      this.showConfirmModal = false;
      this.itemToRemove = null;
    } catch (err) {
      console.error('Failed to remove saved content:', err);
    } finally {
      this.isRemoving = false;
    }
  }
}
