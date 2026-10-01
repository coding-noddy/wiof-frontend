import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';
import { ActivityService } from 'src/app/services/activity.service';
import { SavedContentService } from 'src/app/services/saved-content.service';
import { ActionService } from 'src/app/services/action.service';
import { UserActionService } from 'src/app/services/user-action.service';

interface LastActivity {
  type: 'blog' | 'video';
  title: string;
  link: string;
  date: Date;
}

/**
 * Home page "Continue Your Journey" (signed in) / guest invite panel.
 * There's no in-progress "resume at X%" tracking anywhere in the app —
 * only blog_read_complete / video_watch_complete events — so the activity
 * card surfaces whichever of the two is most recently *completed*, not a
 * resume position.
 */
@Component({
  selector: 'app-home-journey-panel',
  templateUrl: './home-journey-panel.component.html',
  styleUrls: ['./home-journey-panel.component.scss']
})
export class HomeJourneyPanelComponent implements OnInit, OnDestroy {
  isAuthenticated = false;
  isLoading = true;
  signingIn = false;
  signInError = false;

  lastActivity: LastActivity | null = null;
  lastEqScore: number | null = null;
  savedContentCount = 0;

  // Protect Through Action tile (Section 14 of the architecture doc).
  actionsCompletedCount = 0;
  nextActionTitle: string | null = null;

  private destroy$ = new Subject<void>();
  private userId: string | null = null;

  constructor(
    private authService: AuthService,
    private activityService: ActivityService,
    private savedContentService: SavedContentService,
    private actionService: ActionService,
    private userActionService: UserActionService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.isAuthenticated = !!user;
        this.userId = user?.uid || null;
        if (user) {
          this.loadJourney(user.uid);
        } else {
          this.isLoading = false;
        }
      });
  }

  /**
   * Re-fetches journey data for the current user. Ionic keeps this
   * component's home page alive in the nav stack rather than destroying it
   * on back-navigation, so ngOnInit never re-runs on its own — home.page.ts
   * calls this from ionViewWillEnter() instead, e.g. so a blog saved from
   * another page shows up in the count on return without a full reload.
   */
  refresh(): void {
    if (this.userId) {
      this.loadJourney(this.userId);
    }
  }

  private loadJourney(userId: string): void {
    this.isLoading = true;

    forkJoin({
      reads: this.activityService.getQualityReads(userId),
      videos: this.activityService.getVideoWatchHistory(userId),
      metrics: this.activityService.getActivityCounts(userId).pipe(first()),
      // profile.savedBlogsCount is never actually incremented anywhere in
      // functions/index.js (only ever initialized/reset to 0) — it's a dead
      // counter. The real count comes from querying user_saved_content
      // directly, the same source my-journey.page.ts uses for its own count.
      savedIds: this.savedContentService.getSavedContentIds(userId).pipe(first()),
      actions: this.actionService.getActiveActions().pipe(first()),
      actionHistory: this.userActionService.getUserActionHistory(userId).pipe(first())
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ reads, videos, metrics, savedIds, actions, actionHistory }) => {
        const candidates: LastActivity[] = [];
        const latestRead = reads[0];
        const latestVideo = videos[0];

        if (latestRead) {
          candidates.push({
            type: 'blog',
            title: latestRead.blogTitle,
            link: `/element/earth/blog/${latestRead.contentId}`,
            date: latestRead.completedDate
          });
        }
        if (latestVideo) {
          candidates.push({
            type: 'video',
            title: latestVideo.videoTitle,
            link: `/element/earth/video/${latestVideo.contentId}`,
            date: latestVideo.completedDate
          });
        }
        candidates.sort((a, b) => b.date.getTime() - a.date.getTime());

        this.lastActivity = candidates[0] || null;
        this.lastEqScore = metrics.lastEqScore;
        this.savedContentCount = savedIds.size;
        this.actionsCompletedCount = metrics.totalActionsCompleted || 0;

        // Suggest a featured action the user hasn't tried before; fall back
        // to any not-yet-tried action, then to the first active one if
        // they've engaged with everything already.
        const completedIds = new Set(actionHistory.map((h) => h.actionId));
        const next =
          actions.find((a) => a.isFeatured && !completedIds.has(a.id)) ||
          actions.find((a) => !completedIds.has(a.id)) ||
          actions[0];
        this.nextActionTitle = next?.title || null;

        this.isLoading = false;
      });
  }

  scrollToElements(): void {
    const el = document.querySelector('app-life-elements');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async signIn(): Promise<void> {
    this.signingIn = true;
    this.signInError = false;
    try {
      await this.authService.signInWithGoogle();
    } catch (error) {
      this.signInError = true;
    } finally {
      this.signingIn = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
