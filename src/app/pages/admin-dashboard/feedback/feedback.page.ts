import { Component, OnInit } from '@angular/core';
import { UI_MESSAGES } from '../../../app.constants';
import {
  Feedback,
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  FeedbackStatus,
  LEGACY_FEEDBACK_CATEGORY_LABELS
} from '../../../models/Feedback';
import { ExcelGeneratorService } from '../../../services/excel-generator.service';
import { FeedbackService } from '../../../services/feedback.service';
import { UiUtilService } from '../../../util/UiUtilService';

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.page.html',
  styleUrls: ['./feedback.page.scss']
})
export class FeedbackPage implements OnInit {
  allFeedback: Feedback[] = [];
  filteredFeedback: Feedback[] = [];
  categories = FEEDBACK_CATEGORIES;
  statuses = FEEDBACK_STATUSES;
  categoryFilter = '';
  statusFilter = '';
  expandedId: string;
  loading = true;
  summary = { total: 0, new: 0, issues: 0 };

  constructor(
    private _excelGenerator: ExcelGeneratorService,
    private _feedbackService: FeedbackService,
    private uiUtil: UiUtilService
  ) {}

  ngOnInit() {
    this.loadFeedback();
  }

  loadFeedback() {
    this.loading = true;
    this._feedbackService.getAllFeedback().subscribe(
      (data) => {
        this.allFeedback = data;
        this.loading = false;
        this.applyFilters();
      },
      () => {
        this.loading = false;
        this.uiUtil.presentToast('Failed to load feedback. Please try again.', 'error');
      }
    );
  }

  applyFilters() {
    this.filteredFeedback = this.allFeedback.filter(
      (f) =>
        (!this.categoryFilter || f.category === this.categoryFilter) &&
        (!this.statusFilter || f.status === this.statusFilter)
    );
    this.summary.total = this.allFeedback.length;
    this.summary.new = this.allFeedback.filter((f) => f.status === 'new').length;
    this.summary.issues = this.allFeedback.filter((f) => f.category === 'issue').length;
  }

  categoryLabel(value: string): string {
    return this.categories.find((c) => c.value === value)?.label || LEGACY_FEEDBACK_CATEGORY_LABELS[value] || value;
  }

  toDate(createdAt: any): Date | null {
    return createdAt?.toDate ? createdAt.toDate() : null;
  }

  toggleExpand(id: string) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  changeStatus(item: Feedback, status: FeedbackStatus) {
    const previous = item.status;
    item.status = status;
    this.applyFilters();
    this._feedbackService.updateStatus(item.id, status).subscribe(
      () => {},
      () => {
        item.status = previous;
        this.applyFilters();
        this.uiUtil.presentToast(
          UI_MESSAGES.FAILURE_ADD_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, 'status'),
          'error'
        );
      }
    );
  }

  deleteFeedback(item: Feedback) {
    this.uiUtil.presentAlert(
      UI_MESSAGES.CONFIRM_HEADER,
      UI_MESSAGES.CONFIRM_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, 'feedback'),
      [
        {
          text: 'Confirm Delete',
          handler: () => {
            this._feedbackService.deleteFeedback(item.id).subscribe(
              () => {
                this.allFeedback = this.allFeedback.filter((f) => f.id !== item.id);
                this.applyFilters();
                this.uiUtil.presentToast(
                  UI_MESSAGES.SUCCESS_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, 'Feedback'),
                  'success'
                );
              },
              () =>
                this.uiUtil.presentToast(
                  UI_MESSAGES.FAILURE_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, 'feedback'),
                  'error'
                )
            );
          }
        },
        { text: UI_MESSAGES.CONFIRM_DELETE_SECONDARY_CTA, role: 'cancel' }
      ]
    );
  }

  /** Exports the currently filtered rows with readable column names. */
  generateExcel() {
    const rows = this.filteredFeedback.map((f) => {
      const date = this.toDate(f.createdAt);
      return {
        Date: date ? date.toLocaleString() : '',
        Category: this.categoryLabel(f.category),
        Status: f.status,
        Message: f.message,
        Name: f.name || '',
        Email: f.email || '',
        'Signed-in User ID': f.userId || '',
        Page: f.pageUrl || '',
        Browser: f.userAgent || ''
      };
    });
    this._excelGenerator.exportAsExcelFile(rows, 'wiof_feedback');
  }
}
