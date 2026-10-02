import { Component, Input, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { ModalController } from '@ionic/angular';
import { ActionItem } from 'src/app/models/ActionItem';
import { UserAction } from 'src/app/models/UserAction';
import { AuthService } from 'src/app/services/auth.service';
import { UserActionService } from 'src/app/services/user-action.service';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { REPEAT_TYPE, USER_ACTION_STATUS } from 'src/app/app.constants';
import { toCalendarDay } from 'src/app/services/activity.service';
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
  styleUrls: ['./take-action-card.component.scss']
})
export class TakeActionCardComponent implements OnInit, OnChanges, OnDestroy {
  @Input() action: ActionItem;

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
    private modalCtrl: ModalController
  ) {}

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
    if (this.action.repeatType === REPEAT_TYPE.REPEATABLE || this.action.repeatType === REPEAT_TYPE.OCCASIONAL) {
      return false;
    }
    return true;
  }

  /** "Completed" alone doesn't tell a DAILY user when they can do it again. */
  get buttonLabel(): string {
    if (!this.isDone) {
      return 'Mark as Done';
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

    this.isLoading = true;
    try {
      await this.userActionService.completeAction(this.userId!, this.action);
      // getUserActionStatus()/getActionStreak() are one-time reads, not live
      // listeners — without re-running them here the button would silently
      // stay in its pre-completion state until something else happened to
      // re-create this component (e.g. a full page reload). Re-fetch now so
      // "Mark as Done" actually shows "Completed" / the new streak right away.
      this.subscribeToStatus();
      this.subscribeToStreak();
    } catch (error) {
      await this.uiUtil.presentToast('Could not record this action. Please try again.', 'error');
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
