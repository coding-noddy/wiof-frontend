import { Component, OnDestroy } from '@angular/core';
import { ModalController, ViewWillEnter } from '@ionic/angular';
import { Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';
import { FeedbackDialogComponent } from 'src/app/components/feedback-dialog/feedback-dialog.component';
import {
  Feedback,
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUS_USER_LABELS,
  LEGACY_FEEDBACK_CATEGORY_LABELS
} from 'src/app/models/Feedback';
import { AuthService } from 'src/app/services/auth.service';
import { FeedbackService } from 'src/app/services/feedback.service';

/**
 * Lets a signed-in user see the feedback they've sent and where each item
 * stands (Received / In review / Resolved). Only feedback sent while signed
 * in carries a userId, so anonymous submissions never appear here.
 */
@Component({
  selector: 'app-my-feedback',
  templateUrl: './my-feedback.page.html',
  styleUrls: ['./my-feedback.page.scss']
})
export class MyFeedbackPage implements ViewWillEnter, OnDestroy {
  feedbackItems: Feedback[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  statusLabels = FEEDBACK_STATUS_USER_LABELS;

  private userId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private feedbackService: FeedbackService,
    private modalCtrl: ModalController
  ) {}

  ionViewWillEnter(): void {
    // Refresh every time the page is shown, so status changes made by the
    // team since the last visit are picked up.
    this.authService.currentUser$
      .pipe(first((u) => u !== null), takeUntil(this.destroy$))
      .subscribe((user) => {
        this.userId = user.uid;
        this.loadFeedback();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFeedback(): void {
    if (!this.userId) return;
    this.isLoading = true;
    this.errorMessage = null;
    this.feedbackService.getMyFeedback(this.userId).subscribe(
      (items) => {
        this.feedbackItems = items;
        this.isLoading = false;
      },
      () => {
        this.errorMessage = 'Could not load your feedback. Please try again.';
        this.isLoading = false;
      }
    );
  }

  categoryLabel(value: string): string {
    return FEEDBACK_CATEGORIES.find((c) => c.value === value)?.label || LEGACY_FEEDBACK_CATEGORY_LABELS[value] || value;
  }

  categoryIcon(value: string): string {
    return FEEDBACK_CATEGORIES.find((c) => c.value === value)?.icon || 'chatbubble-ellipses-outline';
  }

  toDate(createdAt: any): Date | null {
    return createdAt?.toDate ? createdAt.toDate() : null;
  }

  async openFeedback(event?: MouseEvent): Promise<void> {
    const submitted = await FeedbackDialogComponent.present(this.modalCtrl, event);
    if (submitted) {
      this.loadFeedback();
    }
  }
}
