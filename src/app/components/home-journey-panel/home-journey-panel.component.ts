import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';
import { ActivityService } from 'src/app/services/activity.service';
import { UserProfileService } from 'src/app/services/user-profile.service';

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

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private activityService: ActivityService,
    private userProfileService: UserProfileService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.isAuthenticated = !!user;
        if (user) {
          this.loadJourney(user.uid);
        } else {
          this.isLoading = false;
        }
      });
  }

  private loadJourney(userId: string): void {
    this.isLoading = true;

    forkJoin({
      reads: this.activityService.getQualityReads(userId),
      videos: this.activityService.getVideoWatchHistory(userId),
      metrics: this.activityService.getActivityCounts(userId).pipe(first()),
      profile: this.userProfileService.getProfile(userId).pipe(first())
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ reads, videos, metrics, profile }) => {
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
        this.savedContentCount = profile?.savedBlogsCount || 0;
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
