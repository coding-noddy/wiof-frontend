import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { takeUntil, first, catchError } from 'rxjs/operators';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AuthService } from 'src/app/services/auth.service';
import { ActivityService, EngagementMetrics } from 'src/app/services/activity.service';
import { SavedContentService, SavedContentDocument } from 'src/app/services/saved-content.service';
import { UserProfileService } from 'src/app/services/user-profile.service';
import { QualityReadEntry, EqHistoryEntry, PollHistoryEntry } from 'src/app/models/engagement-history';

@Component({
  selector: 'app-my-journey',
  templateUrl: './my-journey.page.html',
  styleUrls: ['./my-journey.page.scss']
})
export class MyJourneyPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State flags for existing sections
  isLoading = true;
  hasError = false;

  // Engagement metrics
  metrics: EngagementMetrics | null = null;
  currentStreak = 0;
  savedContentCount = 0;

  // Saved content list
  savedContent: SavedContentDocument[] = [];
  hasSavedContent = false;

  // Quality Reads section
  qualityReads: QualityReadEntry[] = [];
  qualityReadCount = 0;
  qualityReadsLoading = true;
  qualityReadsError = false;

  // EQ History section
  eqHistory: EqHistoryEntry[] = [];
  eqHistoryLoading = true;
  eqHistoryError = false;

  // Poll History section
  pollHistory: PollHistoryEntry[] = [];
  pollHistoryLoading = true;
  pollHistoryError = false;

  constructor(
    private authService: AuthService,
    private activityService: ActivityService,
    private savedContentService: SavedContentService,
    private userProfileService: UserProfileService,
    private storage: AngularFireStorage
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all engagement data for the current user.
   */
  loadData(): void {
    this.isLoading = true;
    this.hasError = false;

    this.authService.currentUser$
      .pipe(
        first(user => user !== null),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: user => {
          if (!user) {
            this.isLoading = false;
            return;
          }
          this.loadMetrics(user.uid);
          this.loadSavedContent(user.uid);
          this.loadProfile(user.uid);
          // Load new sections in parallel
          this.loadQualityReads(user.uid);
          this.loadEqHistory(user.uid);
          this.loadPollHistory(user.uid);
        },
        error: () => {
          this.isLoading = false;
          this.hasError = true;
        }
      });
  }

  /**
   * Retry loading data after an error.
   */
  retry(): void {
    this.loadData();
  }

  /**
   * Retry loading a specific section.
   */
  retrySection(section: 'qualityReads' | 'eqHistory' | 'pollHistory'): void {
    this.authService.currentUser$
      .pipe(first(user => user !== null), takeUntil(this.destroy$))
      .subscribe(user => {
        if (!user) return;
        switch (section) {
          case 'qualityReads':
            this.loadQualityReads(user.uid);
            break;
          case 'eqHistory':
            this.loadEqHistory(user.uid);
            break;
          case 'pollHistory':
            this.loadPollHistory(user.uid);
            break;
        }
      });
  }

  /**
   * Checks if all new sections have failed (for global retry button).
   */
  get allSectionsFailed(): boolean {
    return this.qualityReadsError && this.eqHistoryError && this.pollHistoryError;
  }

  /**
   * Retry all failed sections.
   */
  retryAllSections(): void {
    this.authService.currentUser$
      .pipe(first(user => user !== null), takeUntil(this.destroy$))
      .subscribe(user => {
        if (!user) return;
        if (this.qualityReadsError) this.loadQualityReads(user.uid);
        if (this.eqHistoryError) this.loadEqHistory(user.uid);
        if (this.pollHistoryError) this.loadPollHistory(user.uid);
      });
  }

  /**
   * Loads engagement metrics from the ActivityService.
   */
  private loadMetrics(userId: string): void {
    this.activityService.getActivityCounts(userId)
      .pipe(
        first(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (metrics) => {
          this.metrics = metrics;
          this.checkLoadingComplete();
        },
        error: (err) => {
          console.warn('Failed to load metrics:', err);
          this.metrics = {
            blogsRead: 0,
            videosWatched: 0,
            pollsVoted: 0,
            lastEqScore: null,
            lastEqDate: null
          };
          this.checkLoadingComplete();
        }
      });
  }

  /**
   * Loads saved content list (max 20, ordered by savedAt desc).
   */
  private loadSavedContent(userId: string): void {
    this.savedContentService.getSavedContent(userId, 20)
      .pipe(
        first(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (result) => {
          this.savedContent = result.items;
          this.savedContentCount = result.items.length;
          this.hasSavedContent = result.items.length > 0;
          this.checkLoadingComplete();
        },
        error: (err) => {
          console.warn('Failed to load saved content:', err);
          this.savedContent = [];
          this.savedContentCount = 0;
          this.hasSavedContent = false;
          this.checkLoadingComplete();
        }
      });
  }

  /**
   * Loads the user profile for currentStreak.
   */
  private loadProfile(userId: string): void {
    this.userProfileService.getProfile(userId)
      .pipe(
        first(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (profile) => {
          if (profile) {
            this.currentStreak = profile.currentStreak || 0;
            this.savedContentCount = Math.max(this.savedContentCount, profile.savedBlogsCount || 0);
          }
          this.checkLoadingComplete();
        },
        error: (err) => {
          console.warn('Failed to load profile:', err);
          this.checkLoadingComplete();
        }
      });
  }

  /**
   * Loads quality read entries for the user (independent section).
   */
  private loadQualityReads(userId: string): void {
    this.qualityReadsLoading = true;
    this.qualityReadsError = false;

    this.activityService.getQualityReads(userId)
      .pipe(
        first(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (entries) => {
          this.qualityReads = entries;
          this.qualityReadCount = entries.length;
          this.qualityReadsLoading = false;
        },
        error: (err) => {
          console.warn('Failed to load quality reads:', err);
          this.qualityReadsLoading = false;
          this.qualityReadsError = true;
        }
      });
  }

  /**
   * Loads EQ history entries for the user (independent section).
   */
  private loadEqHistory(userId: string): void {
    this.eqHistoryLoading = true;
    this.eqHistoryError = false;

    this.activityService.getEqHistory(userId)
      .pipe(
        first(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (entries) => {
          this.eqHistory = entries;
          this.eqHistoryLoading = false;
        },
        error: (err) => {
          console.warn('Failed to load EQ history:', err);
          this.eqHistoryLoading = false;
          this.eqHistoryError = true;
        }
      });
  }

  /**
   * Loads poll history entries for the user (independent section).
   */
  private loadPollHistory(userId: string): void {
    this.pollHistoryLoading = true;
    this.pollHistoryError = false;

    this.activityService.getPollHistory(userId)
      .pipe(
        first(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (entries) => {
          this.pollHistory = entries;
          this.pollHistoryLoading = false;
        },
        error: (err) => {
          console.warn('Failed to load poll history:', err);
          this.pollHistoryLoading = false;
          this.pollHistoryError = true;
        }
      });
  }

  /**
   * Checks if all data has loaded to turn off the loading state.
   */
  private checkLoadingComplete(): void {
    if (this.metrics !== null) {
      this.isLoading = false;
    }
  }

  /**
   * Returns the route link for a saved content item based on type.
   */
  getContentLink(item: SavedContentDocument): string {
    if (item.contentType === 'blog') {
      return `/element/earth/blog/${item.contentId}`;
    }
    return `/element/earth/video/${item.contentId}`;
  }

  /**
   * Formats the last EQ date for display.
   */
  getFormattedEqDate(): string {
    if (!this.metrics?.lastEqDate) {
      return '';
    }
    return this.metrics.lastEqDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Formats a Date object for display in history sections.
   */
  formatDate(date: Date): string {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Formats time spent in seconds to a readable string (e.g., "5 min 30 sec").
   */
  formatTimeSpent(seconds: number): string {
    if (!seconds || seconds <= 0) return '0 sec';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} sec`;
    if (secs === 0) return `${mins} min`;
    return `${mins} min ${secs} sec`;
  }

  /** Cache of resolved image URLs */
  private imageUrls: Record<string, Observable<string>> = {};

  /**
   * Gets the resolved image URL for a saved content item.
   */
  getImageUrl(item: SavedContentDocument): Observable<string> {
    if (!item.contentThumbnail) {
      return of('');
    }
    if (item.contentThumbnail.startsWith('http')) {
      return of(item.contentThumbnail);
    }
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
}
