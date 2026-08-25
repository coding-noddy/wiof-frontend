import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { takeUntil, first, catchError, distinctUntilChanged } from 'rxjs/operators';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AuthService } from 'src/app/services/auth.service';
import { ActivityService, EngagementMetrics } from 'src/app/services/activity.service';
import { SavedContentService, SavedContentDocument } from 'src/app/services/saved-content.service';
import { UserProfileService } from 'src/app/services/user-profile.service';
import { QualityReadEntry, EqHistoryEntry, PollHistoryEntry, VideoWatchHistoryEntry } from 'src/app/models/engagement-history';

@Component({
  selector: 'app-my-journey',
  templateUrl: './my-journey.page.html',
  styleUrls: ['./my-journey.page.scss']
})
export class MyJourneyPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private activeUserId: string | null = null;

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
  eqPreviousExpanded = false;

  // Poll History section
  pollHistory: PollHistoryEntry[] = [];
  pollHistoryLoading = true;
  pollHistoryError = false;

  // Video Watch History section
  videoWatchHistory: VideoWatchHistoryEntry[] = [];
  videoWatchHistoryLoading = true;
  videoWatchHistoryError = false;

  /**
   * Mapping of metric tile identifiers to their target section element IDs.
   */
  private readonly sectionMap: Record<string, string> = {
    'blogs-read': 'quality-reads-section',
    'videos-watched': 'videos-watched-section',
    'polls-voted': 'poll-history-section',
    'eq-score': 'eq-history-section',
    'saved-content': 'saved-content-section'
  };

  constructor(
    private authService: AuthService,
    private activityService: ActivityService,
    private savedContentService: SavedContentService,
    private userProfileService: UserProfileService,
    private storage: AngularFireStorage
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(
        distinctUntilChanged((previous, current) => previous?.uid === current?.uid),
        takeUntil(this.destroy$)
      )
      .subscribe(user => {
        this.activeUserId = user?.uid || null;
        this.resetData();

        if (this.activeUserId) {
          this.loadData(this.activeUserId);
        } else {
          this.isLoading = false;
        }
      });
  }

  /**
   * Ionic lifecycle hook — fires every time the page becomes visible,
   * including back-navigation. Ensures fresh data on every visit.
   */
  ionViewWillEnter(): void {
    if (this.activeUserId) {
      this.loadData(this.activeUserId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all engagement data for the current user.
   */
  loadData(userId: string): void {
    this.isLoading = true;
    this.hasError = false;
    this.loadMetrics(userId);
    this.loadSavedContent(userId);
    this.loadProfile(userId);
    // Load new sections in parallel
    this.loadQualityReads(userId);
    this.loadEqHistory(userId);
    this.loadPollHistory(userId);
    this.loadVideoWatchHistory(userId);
  }

  /**
   * Retry loading data after an error.
   */
  retry(): void {
    if (this.activeUserId) {
      this.loadData(this.activeUserId);
    }
  }

  /**
   * Scrolls smoothly to the detail section corresponding to the given tile key.
   * Does nothing if the page is loading, in error state, or the tile has no target.
   */
  scrollToSection(tileKey: string): void {
    if (this.isLoading || this.hasError) {
      return;
    }

    const sectionId = this.sectionMap[tileKey];
    if (!sectionId) {
      return;
    }

    const element = document.getElementById(sectionId);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Retry loading a specific section.
   */
  retrySection(section: 'qualityReads' | 'eqHistory' | 'pollHistory' | 'videoWatchHistory'): void {
    if (!this.activeUserId) return;
    switch (section) {
      case 'qualityReads':
        this.loadQualityReads(this.activeUserId);
        break;
      case 'eqHistory':
        this.loadEqHistory(this.activeUserId);
        break;
      case 'pollHistory':
        this.loadPollHistory(this.activeUserId);
        break;
      case 'videoWatchHistory':
        this.loadVideoWatchHistory(this.activeUserId);
        break;
    }
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
    if (!this.activeUserId) return;
    if (this.qualityReadsError) this.loadQualityReads(this.activeUserId);
    if (this.eqHistoryError) this.loadEqHistory(this.activeUserId);
    if (this.pollHistoryError) this.loadPollHistory(this.activeUserId);
  }

  private resetData(): void {
    this.isLoading = true;
    this.hasError = false;
    this.metrics = null;
    this.currentStreak = 0;
    this.savedContentCount = 0;
    this.savedContent = [];
    this.hasSavedContent = false;
    this.qualityReads = [];
    this.qualityReadCount = 0;
    this.eqHistory = [];
    this.pollHistory = [];
    this.videoWatchHistory = [];
    this.qualityReadsLoading = true;
    this.eqHistoryLoading = true;
    this.pollHistoryLoading = true;
    this.videoWatchHistoryLoading = true;
    this.qualityReadsError = false;
    this.eqHistoryError = false;
    this.pollHistoryError = false;
    this.videoWatchHistoryError = false;
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
            videosCompleted: 0,
            pollsVoted: 0,
            lastEqScore: null,
            lastEqDate: null,
            lastBlogReadDate: null
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
   * Loads video watch history entries for the user (independent section).
   */
  private loadVideoWatchHistory(userId: string): void {
    this.videoWatchHistoryLoading = true;
    this.videoWatchHistoryError = false;

    this.activityService.getVideoWatchHistory(userId)
      .pipe(
        first(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (entries) => {
          this.videoWatchHistory = entries;
          this.videoWatchHistoryLoading = false;
        },
        error: (err) => {
          console.warn('Failed to load video watch history:', err);
          this.videoWatchHistoryLoading = false;
          this.videoWatchHistoryError = true;
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
   * Formats the last blog read date for display.
   */
  getFormattedLastBlogDate(): string {
    if (!this.metrics?.lastBlogReadDate) {
      return '';
    }
    return this.metrics.lastBlogReadDate.toLocaleDateString('en-US', {
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

  /**
   * Formats a date as short (e.g., "Jan 5").
   */
  formatDateShort(date: Date): string {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Returns a comparison message between latest and previous EQ score.
   */
  getEqComparisonMessage(): string {
    if (this.eqHistory.length < 2) return '';
    const current = this.eqHistory[0].overallScore;
    const previous = this.eqHistory[1].overallScore;
    const diff = current - previous;

    if (diff > 0) return `↑ ${diff} points from last time — great progress!`;
    if (diff < 0) return `↓ ${Math.abs(diff)} points from last time — keep practicing`;
    return 'Same score as last time — staying steady';
  }

  /**
   * Returns CSS class for the EQ trend indicator.
   */
  getEqTrendClass(): string {
    if (this.eqHistory.length < 2) return '';
    const diff = this.eqHistory[0].overallScore - this.eqHistory[1].overallScore;
    if (diff > 0) return 'trend-up';
    if (diff < 0) return 'trend-down';
    return 'trend-neutral';
  }

  /**
   * Returns icon name for the EQ trend indicator.
   */
  getEqTrendIcon(): string {
    if (this.eqHistory.length < 2) return 'remove-outline';
    const diff = this.eqHistory[0].overallScore - this.eqHistory[1].overallScore;
    if (diff > 0) return 'trending-up-outline';
    if (diff < 0) return 'trending-down-outline';
    return 'remove-outline';
  }

  /**
   * Generates SVG sparkline points string from EQ history (oldest to newest).
   */
  getEqSparklinePoints(): string {
    if (this.eqHistory.length < 2) return '';
    // Reverse to show oldest → newest (left to right)
    const scores = [...this.eqHistory].reverse().map(e => e.overallScore);
    const points = this.getEqChartPoints();
    return points.map(p => `${p.x},${p.y}`).join(' ');
  }

  /**
   * Returns chart point coordinates for the sparkline SVG (260x100 viewBox).
   */
  getEqChartPoints(): { x: number; y: number }[] {
    if (this.eqHistory.length < 2) return [];
    const scores = [...this.eqHistory].reverse().map(e => e.overallScore);
    const count = scores.length;
    const leftPadding = 22;
    const rightPadding = 15;
    const topPadding = 15;
    const bottomPadding = 15;
    const width = 260 - leftPadding - rightPadding;
    const height = 100 - topPadding - bottomPadding;
    const minScore = 24;
    const maxScore = 120;

    return scores.map((score, i) => ({
      x: leftPadding + (i / (count - 1)) * width,
      y: topPadding + height - ((score - minScore) / (maxScore - minScore)) * height
    }));
  }

  /**
   * Returns SVG polygon points for the area fill under the chart line.
   */
  getEqAreaPoints(): string {
    const points = this.getEqChartPoints();
    if (points.length < 2) return '';
    const bottomY = 85; // bottom of chart area
    const linePoints = points.map(p => `${p.x},${p.y}`).join(' ');
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    return `${linePoints} ${lastX},${bottomY} ${firstX},${bottomY}`;
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
