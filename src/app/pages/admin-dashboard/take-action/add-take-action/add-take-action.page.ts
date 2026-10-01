import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import {
  ELEMENTS,
  ACTION_TYPE,
  COMPLETION_TYPE,
  REPEAT_TYPE,
  ACTION_DIFFICULTY,
  EVIDENCE_LEVEL,
  UI_MESSAGES,
  ITEMS
} from 'src/app/app.constants';
import { ActionItem } from 'src/app/models/ActionItem';
import { ActionService } from 'src/app/services/action.service';
import { UiUtilService } from 'src/app/util/UiUtilService';

@Component({
  selector: 'app-add-take-action',
  templateUrl: './add-take-action.page.html',
  styleUrls: ['./add-take-action.page.scss']
})
export class AddTakeActionPage implements OnInit, OnDestroy {
  elementsList = Object.values(ELEMENTS);
  actionTypes = Object.values(ACTION_TYPE);
  completionTypes = Object.values(COMPLETION_TYPE);
  repeatTypes = Object.values(REPEAT_TYPE);
  difficulties = Object.values(ACTION_DIFFICULTY);
  evidenceLevels = Object.values(EVIDENCE_LEVEL);

  addActionForm: FormGroup;
  destroy$: Subject<boolean> = new Subject();
  isEditMode = false;
  isSaving = false;
  action: ActionItem = {} as ActionItem;

  constructor(
    private actionService: ActionService,
    private uiUtil: UiUtilService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((param) => {
      if (param.has('mode') && param.get('mode') === 'edit') {
        this.action = this.actionService.getViewEditModeAction();
        if (!this.action) {
          this.router.navigateByUrl('/admin-dashboard/manage-take-action');
          return;
        }
        this.isEditMode = true;
        this.addActionForm = this.initFormByAction(this.action);
      } else {
        this.isEditMode = false;
        this.addActionForm = this.initForm();
      }
    });
  }

  /** Returns true if `element` is currently selected in elementIds. */
  isElementSelected(element: string): boolean {
    const selected: string[] = this.addActionForm.get('elementIds')?.value || [];
    return selected.includes(element);
  }

  /**
   * Pill-toggle multi-select for elementIds, reusing the same interaction
   * pattern as the Settings page's preferred-elements pills — the one
   * existing multi-select-elements UI in this codebase — adapted here to
   * allow any number selected (including just one), since an action can
   * belong to a single element or span several.
   */
  toggleElement(element: string): void {
    const control = this.addActionForm.get('elementIds');
    const current: string[] = control.value || [];
    const next = current.includes(element)
      ? current.filter((e) => e !== element)
      : [...current, element];
    control.setValue(next);
    control.markAsDirty();
  }

  private initForm(): FormGroup {
    return new FormGroup({
      title: new FormControl('', [Validators.required]),
      shortDescription: new FormControl('', [Validators.required]),
      description: new FormControl('', [Validators.required]),
      instructions: new FormControl(''),
      elementIds: new FormControl([], [Validators.required]),
      categories: new FormControl(''),
      tags: new FormControl(''),
      actionType: new FormControl(ACTION_TYPE.PERSONAL, [Validators.required]),
      completionType: new FormControl(COMPLETION_TYPE.SELF_REPORTED, [Validators.required]),
      repeatType: new FormControl(REPEAT_TYPE.ONCE, [Validators.required]),
      difficulty: new FormControl(ACTION_DIFFICULTY.EASY, [Validators.required]),
      estimatedDurationMinutes: new FormControl(5, [Validators.required, Validators.min(1)]),
      iconName: new FormControl('checkmark-circle-outline'),
      mediaUrl: new FormControl(''),
      safetyNotes: new FormControl(''),
      accessibilityNotes: new FormControl(''),
      evidenceLevel: new FormControl(''),
      evidenceSourceOrganization: new FormControl(''),
      evidenceSourceTitle: new FormControl(''),
      evidenceSourceUrl: new FormControl(''),
      evidenceRationale: new FormControl(''),
      evidenceReviewedAt: new FormControl(''),
      displayOrder: new FormControl(0),
      isActive: new FormControl(true),
      isFeatured: new FormControl(false)
    });
  }

  private initFormByAction(action: ActionItem): FormGroup {
    return new FormGroup({
      title: new FormControl(action.title, [Validators.required]),
      shortDescription: new FormControl(action.shortDescription, [Validators.required]),
      description: new FormControl(action.description, [Validators.required]),
      instructions: new FormControl((action.instructions || []).join('\n')),
      elementIds: new FormControl(action.elementIds || [], [Validators.required]),
      categories: new FormControl((action.categories || []).join(', ')),
      tags: new FormControl((action.tags || []).join(', ')),
      actionType: new FormControl(action.actionType, [Validators.required]),
      completionType: new FormControl(action.completionType, [Validators.required]),
      repeatType: new FormControl(action.repeatType, [Validators.required]),
      difficulty: new FormControl(action.difficulty, [Validators.required]),
      estimatedDurationMinutes: new FormControl(action.estimatedDurationMinutes, [Validators.required, Validators.min(1)]),
      iconName: new FormControl(action.iconName || 'checkmark-circle-outline'),
      mediaUrl: new FormControl(action.media?.url || ''),
      safetyNotes: new FormControl((action.safetyNotes || []).join('\n')),
      accessibilityNotes: new FormControl((action.accessibilityNotes || []).join('\n')),
      evidenceLevel: new FormControl(action.evidence?.level || ''),
      evidenceSourceOrganization: new FormControl(action.evidence?.sourceOrganization || ''),
      evidenceSourceTitle: new FormControl(action.evidence?.sourceTitle || ''),
      evidenceSourceUrl: new FormControl(action.evidence?.sourceUrl || ''),
      evidenceRationale: new FormControl(action.evidence?.rationale || ''),
      evidenceReviewedAt: new FormControl(action.evidence?.reviewedAt || ''),
      displayOrder: new FormControl(action.displayOrder || 0),
      isActive: new FormControl(action.isActive),
      isFeatured: new FormControl(action.isFeatured)
    });
  }

  private splitLines(value: string): string[] {
    return (value || '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  private splitCommaList(value: string): string[] {
    return (value || '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private createByForm(form: FormGroup, existing: ActionItem, isEditMode: boolean): ActionItem {
    const mediaUrl = (form.value.mediaUrl || '').trim();
    const evidenceLevel = (form.value.evidenceLevel || '').trim();
    return {
      id: isEditMode ? existing.id : null,
      title: form.value.title,
      shortDescription: form.value.shortDescription,
      description: form.value.description,
      instructions: this.splitLines(form.value.instructions),
      elementIds: form.value.elementIds || [],
      categories: this.splitCommaList(form.value.categories),
      tags: this.splitCommaList(form.value.tags),
      actionType: form.value.actionType,
      completionType: form.value.completionType,
      repeatType: form.value.repeatType,
      estimatedDurationMinutes: form.value.estimatedDurationMinutes,
      difficulty: form.value.difficulty,
      isActive: !!form.value.isActive,
      isFeatured: !!form.value.isFeatured,
      iconName: form.value.iconName,
      media: mediaUrl ? { type: 'YOUTUBE', url: mediaUrl } : null,
      safetyNotes: this.splitLines(form.value.safetyNotes),
      accessibilityNotes: this.splitLines(form.value.accessibilityNotes),
      evidence: evidenceLevel
        ? {
            level: evidenceLevel,
            sourceOrganization: (form.value.evidenceSourceOrganization || '').trim(),
            sourceTitle: (form.value.evidenceSourceTitle || '').trim(),
            sourceUrl: (form.value.evidenceSourceUrl || '').trim(),
            rationale: (form.value.evidenceRationale || '').trim(),
            reviewedAt: (form.value.evidenceReviewedAt || '').trim()
          }
        : null,
      displayOrder: form.value.displayOrder || 0
    } as ActionItem;
  }

  async onSubmit() {
    if (!this.addActionForm.valid) {
      return;
    }
    this.isSaving = true;
    const action = this.createByForm(this.addActionForm, this.action, this.isEditMode);
    const loader = await this.uiUtil.showLoader(
      UI_MESSAGES.SAVE_IN_PROGRESS.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.TAKE_ACTION)
    );
    this.actionService.saveAction(action).pipe(
      takeUntil(this.destroy$),
      catchError((err) => throwError(err))
    ).subscribe(
      () => {
        loader.dismiss();
        this.isSaving = false;
        this.uiUtil.presentToast(
          UI_MESSAGES.SUCCESS_ADD_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.TAKE_ACTION),
          'success'
        );
        this.router.navigateByUrl('/admin-dashboard/manage-take-action');
      },
      () => {
        loader.dismiss();
        this.isSaving = false;
        this.uiUtil.presentToast(
          UI_MESSAGES.FAILURE_ADD_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.TAKE_ACTION),
          'error'
        );
      }
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
