import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { first } from 'rxjs/operators';
import { UI_MESSAGES } from 'src/app/app.constants';
import { FEEDBACK_CATEGORIES, FEEDBACK_LIMITS, FeedbackCategory } from 'src/app/models/Feedback';
import { AuthService } from 'src/app/services/auth.service';
import { FeedbackService } from 'src/app/services/feedback.service';
import { UiUtilService } from 'src/app/util/UiUtilService';

/**
 * Site feedback form — opened from the footer on every public page via
 * ModalController (sized by the `.feedback-modal` cssClass in global.scss).
 * Name/email are optional; when the visitor is signed in they are prefilled
 * and the uid is attached so admins can follow up.
 */
@Component({
  selector: 'app-feedback-dialog',
  templateUrl: './feedback-dialog.component.html',
  styleUrls: ['./feedback-dialog.component.scss']
})
export class FeedbackDialogComponent implements OnInit {
  categories = FEEDBACK_CATEGORIES;
  limits = FEEDBACK_LIMITS;
  submitting = false;
  private userId: string;

  feedbackForm = new FormGroup({
    category: new FormControl<FeedbackCategory>('issue', [Validators.required]),
    message: new FormControl('', [
      Validators.required,
      Validators.minLength(FEEDBACK_LIMITS.MESSAGE_MIN),
      Validators.maxLength(FEEDBACK_LIMITS.MESSAGE_MAX)
    ]),
    name: new FormControl('', [Validators.maxLength(FEEDBACK_LIMITS.NAME_MAX)]),
    email: new FormControl('', [Validators.email, Validators.maxLength(FEEDBACK_LIMITS.EMAIL_MAX)])
  });

  constructor(
    private modalCtrl: ModalController,
    private feedbackService: FeedbackService,
    private authService: AuthService,
    private uiUtil: UiUtilService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.pipe(first()).subscribe((user) => {
      if (!user) return;
      this.userId = user.uid;
      this.feedbackForm.patchValue({
        name: user.displayName || '',
        email: user.email || ''
      });
    });
  }

  get messageLength(): number {
    return (this.feedbackForm.value.message || '').length;
  }

  selectCategory(category: FeedbackCategory) {
    this.feedbackForm.patchValue({ category });
  }

  submit() {
    if (this.feedbackForm.invalid || this.submitting) {
      this.feedbackForm.markAllAsTouched();
      return;
    }
    this.submitting = true;
    const { category, message, name, email } = this.feedbackForm.value;

    this.feedbackService
      .saveFeedback({
        category,
        message: message.trim(),
        name: name?.trim() || undefined,
        email: email?.trim().toLowerCase() || undefined,
        userId: this.userId,
        pageUrl: window.location.href.slice(0, 500),
        userAgent: navigator.userAgent.slice(0, 500)
      })
      .subscribe(
        () => {
          this.submitting = false;
          this.uiUtil.presentToast(UI_MESSAGES.SUCCESS_FEEDBACK, 'success');
          this.close();
        },
        () => {
          this.submitting = false;
          this.uiUtil.presentToast(
            UI_MESSAGES.FAILURE_ADD_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, 'feedback'),
            'error'
          );
        }
      );
  }

  close(): void {
    this.modalCtrl.dismiss();
  }
}
