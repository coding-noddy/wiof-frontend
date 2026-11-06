import { Component, Input, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { ModalController } from '@ionic/angular';
import { ActionItem } from 'src/app/models/ActionItem';
import { UserAction } from 'src/app/models/UserAction';
import { AuthService } from 'src/app/services/auth.service';
import { UserActionService } from 'src/app/services/user-action.service';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { REPEAT_TYPE, USER_ACTION_STATUS } from 'src/app/app.constants';
import { ActivityService, toCalendarDay } from 'src/app/services/activity.service';
import { ActionImpact, clampAmount, formatImpact, impactValue, validImpact } from 'src/app/models/Impact';
import { TakeActionDetailComponent } from '../take-action-detail/take-action-detail.component';
import { buildModalZoomAnimation } from 'src/app/util/modal-zoom-animation';

/**
 * One action's card: title, short description, and a Start/Mark-Complete
 * control whose state depends on the current user's user_actions record.
 * Guests see the same card but get a "sign in to save your progress" prompt
 * on tap (Section 15) instead of a direct write — mirrors
 * BookmarkIconComponent's inline sign-in-prompt idiom exactly, the existing
 * pattern for this kind of gated action in this codebase.
 */
@Component({
    selector: 'app-take-action-card',
    templateUrl: './take-action-card.component.html',
    styleUrls: ['./take-action-card.component.scss'],
    standalone: false
})
export class TakeActionCardComponent implements OnInit, OnChanges, OnDestroy {
  @Input() action: ActionItem;
  /**
   * Heading level of the title for screen readers, when the card sits under
   * a heading deeper than the page's own (e.g. 4 inside Explore next's groups).
   */
  @Input() headingLevel: number | null = null;
  /** `row`: one compact line (icon, title, time, button), for Explore next under a story. */
  @Input() layout: 'card' | 'row' = 'card';
  /**
   * Under a story or video the first step is "I'll try this" (saved as
   * started, IN_PROGRESS), then "Done it": asking someone who has just read
   * about it to say they've already done it is asking too much (8.10.0).
   */
  @Input() offerTry = false;

  isAuthenticated = false;
  private userId: string | null = null;

  userAction: UserAction | null = null;
  isLoading = false;
  showSignInPrompt = false;
  streak = 0;
  private promptDismissedThisSession = false;

  private subscriptions: Subscription[] = [];
  private statusSub: Subscription | null = null;
  private streakSub: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private userActionService: UserActionService,
    private uiUtil: UiUtilService,
    private modalCtrl: ModalController,
    private activityService: ActivityService
  ) {}

  /**
   * "About how much?" after completing an action with an impact recipe
   * (8.14.0): one optional line, prefilled with the last amount used on this
   * device (or the recipe's modest default). The completion already counts
   * the default, so Skip needs nothing; Save sends the amount, which the
   * server checks and caps (functions/impact.js).
   */
  impactPrompt: { impact: ActionImpact; completionNumber: number; amount: number } | null = null;
  savingImpact = false;

  private lastAmountKey(): string {
    return `wiof_impact_amount_${this.action.id}`;
  }

  private openImpactPrompt(completionNumber: number): void {
    const impact = validImpact(this.action?.impact);
    if (!impact) return;
    let last: number | null = null;
    try {
      const stored = localStorage.getItem(this.lastAmountKey());
      last = stored !== null ? Number(stored) : null;
    } catch {
      // Storage unavailable: use the default.
    }
    const amount = last !== null && Number.isFinite(last) && last > 0 ? clampAmount(impact, last) : impact.inputDefault;
    this.impactPrompt = { impact, completionNumber, amount };
  }

  setImpactAmount(value: string): void {
    if (this.impactPrompt) this.impactPrompt.amount = clampAmount(this.impactPrompt.impact, Number(value));
  }

  get impactPreview(): string {
    const p = this.impactPrompt;
    return p ? formatImpact(p.impact, impactValue(p.impact, p.amount)) : '';
  }

  async saveImpact(): Promise<void> {
    const p = this.impactPrompt;
    if (!p || !this.userId || this.savingImpact) return;
    this.savingImpact = true;
    try {
      await this.activityService.logImpactReported(this.userId, this.action.id, p.completionNumber, p.amount);
      try {
        localStorage.setItem(this.lastAmountKey(), String(p.amount));
      } catch {
        // Storage unavailable: next time starts from the default.
      }
      void this.uiUtil.presentToast(`Saved: ${this.impactPreview}`, 'success', 2500);
      this.impactPrompt = null;
    } catch (error) {
      await this.uiUtil.presentToast('Could not save that. It still counts at the usual amount.', 'error');
    } finally {
      this.savingImpact = false;
    }
  }

  skipImpact(): void {
    this.impactPrompt = null;
  }

  ngOnInit(): void {
    const authSub = this.authService.currentUser$.subscribe((user) => {
      this.isAuthenticated = !!user;
      this.userId = user?.uid || null;
      this.subscribeToStatus();
      this.subscribeToStreak();
    });
    this.subscriptions.push(authSub);
  }

  ngOnChanges(): void {
    this.subscribeToStatus();
    this.subscribeToStreak();
  }

  private subscribeToStatus(): void {
    if (this.statusSub) {
      this.statusSub.unsubscribe();
      this.statusSub = null;
    }
    if (!this.isAuthenticated || !this.userId || !this.action?.id) {
      this.userAction = null;
      return;
    }
    this.statusSub = this.userActionService
      .getUserActionStatus(this.userId, this.action.id)
      .subscribe((status) => {
        if (!this.isLoading) {
          this.userAction = status;
        }
      });
  }

  /** Streak only means anything for DAILY actions — see getActionStreak(). */
  private subscribeToStreak(): void {
    if (this.streakSub) {
      this.streakSub.unsubscribe();
      this.streakSub = null;
    }
    if (!this.isAuthenticated || !this.userId || !this.action?.id || this.action.repeatType !== REPEAT_TYPE.DAILY) {
      this.streak = 0;
      return;
    }
    this.streakSub = this.userActionService
      .getActionStreak(this.userId, this.action.id)
      .subscribe((streak) => {
        this.streak = streak;
      });
  }

  /**
   * For a DAILY action already completed at least once, whether today's
   * completion slot is already used — the UI-facing mirror of the
   * user_action_completions guard doc UserActionService checks server-side.
   */
  get completedToday(): boolean {
    if (!this.userAction?.lastCompletedAt) {
      return false;
    }
    const raw: any = this.userAction.lastCompletedAt;
    const date = raw.toDate ? raw.toDate() : new Date(raw);
    return toCalendarDay(date) === toCalendarDay(new Date());
  }

  /**
   * Whether the Mark-as-Done button should show completed/disabled.
   * ONCE: permanent once complete. DAILY: only for today's completion.
   * REPEATABLE/OCCASIONAL: never permanently disabled — the user can always
   * mark it done again, since those repeat types carry no per-period dedup
   * (bug fix: this used to fall through to "permanently done" for anything
   * that wasn't DAILY, which silently disabled every REPEATABLE/OCCASIONAL
   * action's button after its first completion).
   */
  get isDone(): boolean {
    if (!this.userAction || this.userAction.status !== USER_ACTION_STATUS.COMPLETE) {
      return false;
    }
    if (this.action.repeatType === REPEAT_TYPE.DAILY) {
      return this.completedToday;
    }
    if (this.isRepeatable) {
      return false;
    }
    return true;
  }

  /** REPEATABLE/OCCASIONAL: can be marked done again any time. */
  get isRepeatable(): boolean {
    return this.action.repeatType === REPEAT_TYPE.REPEATABLE || this.action.repeatType === REPEAT_TYPE.OCCASIONAL;
  }

  /**
   * Shown above the button from the first completion, so a repeatable
   * action (whose button never turns into "Completed") still shows it was
   * recorded. ONCE actions already say "Completed" on the button.
   */
  get completionLabel(): string {
    const count = this.userAction?.completionCount || 0;
    if (count < 1 || this.action.repeatType === REPEAT_TYPE.ONCE) {
      return '';
    }
    const today = this.isRepeatable && this.completedToday ? ' · last today' : '';
    return `Completed ${count}x${today}`;
  }

  /** Not started or done yet, where the card offers "I'll try this" first. */
  get tryFirst(): boolean {
    return this.offerTry && !this.userAction;
  }

  get isTrying(): boolean {
    return this.userAction?.status === USER_ACTION_STATUS.IN_PROGRESS;
  }

  /** The line above the button: started, or how often it's been done. */
  get statusNote(): string {
    return this.isTrying ? "You're trying this" : this.completionLabel;
  }

  get buttonIcon(): string {
    if (this.tryFirst) return 'add-circle-outline';
    return this.isDone ? 'checkmark-circle' : 'checkmark-circle-outline';
  }

  /** "Completed" alone doesn't tell a DAILY user when they can do it again. */
  get buttonLabel(): string {
    if (this.tryFirst) return "I'll try this";
    if (this.offerTry && this.isTrying) return 'Done it';
    if (!this.isDone) {
      return this.isRepeatable && this.userAction?.completionCount ? 'Do it again' : 'Mark as Done';
    }
    return this.action.repeatType === REPEAT_TYPE.DAILY ? 'Come back tomorrow' : 'Completed';
  }

  async onActionClick(): Promise<void> {
    if (!this.isAuthenticated) {
      if (!this.promptDismissedThisSession) {
        this.showSignInPrompt = true;
      }
      return;
    }
    if (this.isLoading || this.isDone) {
      return;
    }

    if (this.tryFirst) {
      await this.startTrying();
      return;
    }

    this.isLoading = true;
    const doneBefore = this.userAction?.completionCount || 0;
    try {
      await this.userActionService.completeAction(this.userId!, this.action);
      // Not awaited: a toast failure mustn't show the "could not record" error.
      void this.uiUtil.presentToast(
        doneBefore > 0 ? `Marked as done again (${doneBefore + 1}x)` : 'Marked as done. Nice work!',
        'success',
        2500
      );
      // getUserActionStatus()/getActionStreak() are one-time reads, not live
      // listeners — without re-running them here the button would silently
      // stay in its pre-completion state until something else happened to
      // re-create this component (e.g. a full page reload). Re-fetch now so
      // "Mark as Done" actually shows "Completed" / the new streak right away.
      // (Not loading any more first, or the status read would be ignored.)
      this.isLoading = false;
      this.subscribeToStatus();
      this.openImpactPrompt(doneBefore + 1);
      this.subscribeToStreak();
    } catch (error) {
      await this.uiUtil.presentToast('Could not record this action. Please try again.', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  private async startTrying(): Promise<void> {
    this.isLoading = true;
    try {
      await this.userActionService.startAction(this.userId!, this.action);
      void this.uiUtil.presentToast("Saved. Mark it done here or on Take Action once you've tried it.", 'success', 3000);
      this.isLoading = false;
      this.subscribeToStatus();
    } catch (error) {
      await this.uiUtil.presentToast('Could not save this action. Please try again.', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  get hasDetails(): boolean {
    return !!(
      this.action.description ||
      this.action.instructions?.length ||
      this.action.safetyNotes?.length ||
      this.action.accessibilityNotes?.length ||
      this.action.evidence
    );
  }

  async openDetails(event?: MouseEvent): Promise<void> {
    const originEl = event?.currentTarget as HTMLElement;
    const originRect = originEl?.getBoundingClientRect();

    const modal = await this.modalCtrl.create({
      component: TakeActionDetailComponent,
      componentProps: { action: this.action },
      cssClass: 'take-action-detail-modal',
      backdropDismiss: true,
      enterAnimation: (baseEl) => buildModalZoomAnimation(baseEl, originRect, false),
      leaveAnimation: (baseEl) => buildModalZoomAnimation(baseEl, originRect, true)
    });
    await modal.present();
  }

  dismissPrompt(): void {
    this.showSignInPrompt = false;
    this.promptDismissedThisSession = true;
  }

  async signInWithGoogle(): Promise<void> {
    this.showSignInPrompt = false;
    try {
      await this.authService.signInWithGoogle();
    } catch (error) {
      // Auth error is handled by AuthService itself
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    if (this.statusSub) {
      this.statusSub.unsubscribe();
    }
    if (this.streakSub) {
      this.streakSub.unsubscribe();
    }
  }
}
