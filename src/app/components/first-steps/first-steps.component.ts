import { Component, Input, OnChanges } from '@angular/core';
import { FirstStep, firstSteps, showFirstSteps } from 'src/app/models/Journey';
import { EngagementMetrics } from 'src/app/services/activity.service';
import { UserProfile, UserProfileService } from 'src/app/services/user-profile.service';

/**
 * "Your first steps" (Phase 2 step 5): five starter steps, each ticked by a
 * server-trusted metric (models/Journey.ts), on the home panel and My
 * Journey. Never mandatory: it can be hidden for good, and it disappears by
 * itself once every step is done.
 */
@Component({
    selector: 'app-first-steps',
    templateUrl: './first-steps.component.html',
    styleUrls: ['./first-steps.component.scss'],
    standalone: false
})
export class FirstStepsComponent implements OnChanges {
  @Input() profile: UserProfile | null = null;
  @Input() metrics: EngagementMetrics | null = null;
  /** Smaller, for the home panel. */
  @Input() compact = false;

  steps: FirstStep[] = [];
  visible = false;
  doneCount = 0;
  hiding = false;

  constructor(private profiles: UserProfileService) {}

  ngOnChanges(): void {
    this.steps = firstSteps(this.profile, this.metrics);
    this.doneCount = this.steps.filter((s) => s.done).length;
    this.visible = !this.hiding && showFirstSteps(this.profile, this.steps);
  }

  /** The first step not done yet, highlighted as "next". */
  get nextKey(): FirstStep['key'] | null {
    return this.steps.find((s) => !s.done)?.key || null;
  }

  async hide(): Promise<void> {
    if (!this.profile?.uid) return;
    this.hiding = true;
    this.visible = false;
    try {
      await this.profiles.dismissFirstSteps(this.profile.uid);
    } catch (err) {
      console.warn('Hiding first steps failed:', err);
    }
  }
}
