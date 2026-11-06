import { Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, forkJoin, Observable, of, Subject } from 'rxjs';
import { first, map, shareReplay, takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';
import { ActivityService } from 'src/app/services/activity.service';
import { SavedContentService } from 'src/app/services/saved-content.service';
import { ActionService } from 'src/app/services/action.service';
import { UserActionService } from 'src/app/services/user-action.service';
import { UserProfile, UserProfileService } from 'src/app/services/user-profile.service';
import { BlogService } from 'src/app/services/blog.service';
import { EngagementMetrics } from 'src/app/services/activity.service';
import { NextForYou, nextForYouElements } from 'src/app/models/NextForYou';
import { firstSteps, preferredElements, showFirstSteps } from 'src/app/models/Journey';
import { NextForYouService } from 'src/app/services/next-for-you.service';
import { ActionItem } from 'src/app/models/ActionItem';
import { FOLLOW_UP_LATER_KEY, pickFollowUp } from 'src/app/models/FollowUp';
import { toCalendarDay } from 'src/app/services/activity.service';
import { UiUtilService } from 'src/app/util/UiUtilService';

interface LastActivity {
  type: 'blog' | 'video';
  title: string;
  link: string | string[];
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
    styleUrls: ['./home-journey-panel.component.scss'],
    standalone: false
})
export class HomeJourneyPanelComponent implements OnInit, OnDestroy {
  isAuthenticated = false;
  isLoading = true;
  signingIn = false;
  signInError = false;

  lastActivity: LastActivity | null = null;
  lastEqScore: number | null = null;
  savedContentCount = 0;

  // Protect Through Action tile (Section 14 of the architecture doc). The
  // next action to try is suggested by "Next for you" below the tiles.
  actionsCompletedCount = 0;

  // "Next for you" (Phase 2 step 7): loaded after the tiles, from the same data.
  nextForYou: NextForYou | null = null;

  // Personalizes "Welcome back" — null while loading/unavailable, in which
  // case the template falls back to the plain unpersonalized greeting.
  firstName: string | null = null;

  /**
   * The home page stays calm (8.11.0): first steps and "Next for you" are one
   * quiet line each, and open in a modal when the reader is curious.
   */
  sheet: 'steps' | 'next' | null = null;
  /** "3 of 5" for the first-steps line; null once they're done or hidden. */
  stepsGlance$: Observable<{ done: number; total: number } | null> = of(null);

  get pickCount(): number {
    return (this.nextForYou?.read.length || 0) + (this.nextForYou?.act.length || 0);
  }

  /** Following a link inside the modal closes it. */
  closeOnLink(event: Event): void {
    if ((event.target as HTMLElement | null)?.closest?.('a[href]')) this.sheet = null;
  }

  // Live, for the first-steps checklist: it ticks as soon as the server counts a step.
  profile$: Observable<UserProfile | null> = of(null);
  metrics$: Observable<EngagementMetrics | null> = of(null);

  private destroy$ = new Subject<void>();
  private userId: string | null = null;

  constructor(
    private authService: AuthService,
    private activityService: ActivityService,
    private savedContentService: SavedContentService,
    private actionService: ActionService,
    private userActionService: UserActionService,
    private userProfileService: UserProfileService,
    private blogService: BlogService,
    private nextForYouService: NextForYouService,
    private uiUtil: UiUtilService
  ) {}

  /** "Did you try it?" (8.15.0, models/FollowUp.ts): an action started on an earlier day. */
  followUp: ActionItem | null = null;
  followUpBusy = false;

  private readLater(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(FOLLOW_UP_LATER_KEY) || '{}') || {};
    } catch {
      return {};
    }
  }

  /** "Yes, I did": marks it done (the impact counts at its usual amount). */
  async triedIt(): Promise<void> {
    const action = this.followUp;
    if (!action || !this.userId || this.followUpBusy) return;
    this.followUpBusy = true;
    try {
      await this.userActionService.completeAction(this.userId, action);
      this.followUp = null;
      void this.uiUtil.presentToast(`Nice work! "${action.title}" is marked as done.`, 'success', 3000);
      this.refresh();
    } catch {
      await this.uiUtil.presentToast('Could not record this action. Please try again.', 'error');
    } finally {
      this.followUpBusy = false;
    }
  }

  /** "Not yet": no reminder again today, on this device. */
  notYet(): void {
    const action = this.followUp;
    if (!action) return;
    const later = { ...this.readLater(), [action.id]: toCalendarDay(new Date()) };
    try {
      localStorage.setItem(FOLLOW_UP_LATER_KEY, JSON.stringify(later));
    } catch {
      // Storage unavailable: hidden for this visit only.
    }
    this.followUp = null;
  }

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.isAuthenticated = !!user;
        this.userId = user?.uid || null;
        if (user) {
          // Shared: the first-steps line and the checklist in its modal read the same listeners.
          this.profile$ = this.userProfileService.getProfile(user.uid).pipe(shareReplay({ bufferSize: 1, refCount: true }));
          this.metrics$ = this.activityService.getActivityCounts(user.uid).pipe(shareReplay({ bufferSize: 1, refCount: true }));
          this.stepsGlance$ = combineLatest([this.profile$, this.metrics$]).pipe(
            map(([profile, metrics]) => {
              const steps = firstSteps(profile, metrics);
              return showFirstSteps(profile, steps) ? { done: steps.filter((s) => s.done).length, total: steps.length } : null;
            })
          );
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
      actionHistory: this.userActionService.getUserActionHistory(userId).pipe(first()),
      profile: this.userProfileService.getProfile(userId).pipe(first())
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ reads, videos, metrics, savedIds, actions, actionHistory, profile }) => {
        this.firstName = this.userProfileService.resolveFirstName(profile) || null;
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
        // A read only records the blog's slug or ID, not its element: look
        // the post up so the link goes to the right element (it used to
        // always say Earth).
        const last = this.lastActivity;
        if (last?.type === 'blog' && latestRead) {
          this.blogService
            .getBlogLink(latestRead.contentId)
            .pipe(first(), takeUntil(this.destroy$))
            .subscribe({
              next: (link) => {
                if (link) last.link = link;
              },
              error: () => {}
            });
        }
        this.lastEqScore = metrics.lastEqScore;
        this.savedContentCount = savedIds.size;
        this.actionsCompletedCount = metrics.totalActionsCompleted || 0;

        this.isLoading = false;
        this.followUp = pickFollowUp(actionHistory, actions, new Date(), this.readLater(), toCalendarDay(new Date()));

        const elements = nextForYouElements(profile, metrics);
        const basis = preferredElements(profile).length ? 'chosen' : 'explored';
        this.nextForYouService
          .nextForYou({ elements, reads, activeActions: actions, actionHistory })
          .pipe(takeUntil(this.destroy$))
          .subscribe((picks) => (this.nextForYou = { ...picks, basis }));
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
