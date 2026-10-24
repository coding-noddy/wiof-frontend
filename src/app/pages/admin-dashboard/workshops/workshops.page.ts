import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UI_MESSAGES } from 'src/app/app.constants';
import { Workshop } from 'src/app/models/Workshop';
import { WorkshopService } from 'src/app/services/workshop.service';
import { UiUtilService } from 'src/app/util/UiUtilService';

const MAX_POSTER_BYTES = 10 * 1024 * 1024;

const emptyWorkshop = (): Workshop => ({
  title: '',
  description: '',
  eventDate: '',
  modeOrVenue: '',
  registrationUrl: '',
  posterName: '',
  posterUrl: '',
  published: true
});

/**
 * ClimatEnlighten workshops: a list plus one add/edit form on the same page
 * (a handful of workshops at a time doesn't need separate manage/add pages).
 * Published workshops show on /climatenlighten until their date has passed.
 */
@Component({
  selector: 'app-workshops',
  templateUrl: './workshops.page.html',
  styleUrls: ['./workshops.page.scss']
})
export class WorkshopsPage implements OnInit, OnDestroy {
  destroy$ = new Subject<void>();

  isLoading = true;
  loadError = false;
  workshops: Workshop[] = [];

  /** The workshop being added or edited; null when the form is closed. */
  editing: Workshop | null = null;
  posterFile: File | null = null;
  posterPreview: string | null = null;
  saving = false;

  readonly today = WorkshopService.today();

  constructor(
    private workshopService: WorkshopService,
    private uiUtil: UiUtilService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.loadError = false;
    this.workshopService.getAllWorkshops().pipe(takeUntil(this.destroy$)).subscribe(
      (workshops) => {
        this.workshops = workshops;
        this.isLoading = false;
      },
      () => {
        this.isLoading = false;
        this.loadError = true;
      }
    );
  }

  statusOf(workshop: Workshop): 'live' | 'draft' | 'past' {
    if (workshop.eventDate < this.today) return 'past';
    return workshop.published ? 'live' : 'draft';
  }

  eventDate(workshop: Workshop): Date {
    return WorkshopService.eventDateAsDate(workshop.eventDate);
  }

  startAdd() {
    this.openForm(emptyWorkshop());
  }

  startEdit(workshop: Workshop) {
    this.openForm({ ...workshop });
  }

  private openForm(workshop: Workshop) {
    this.editing = workshop;
    this.posterFile = null;
    this.posterPreview = workshop.posterUrl || null;
    setTimeout(() => document.getElementById('workshop-form')?.scrollIntoView({ behavior: 'smooth' }));
  }

  cancelEdit() {
    this.editing = null;
    this.posterFile = null;
    this.posterPreview = null;
  }

  onPosterSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_POSTER_BYTES) {
      this.uiUtil.presentToast('Please choose an image under 10 MB.', 'error');
      input.value = '';
      return;
    }
    this.posterFile = file;
    const reader = new FileReader();
    reader.onload = () => (this.posterPreview = reader.result as string);
    reader.readAsDataURL(file);
  }

  get linkValid(): boolean {
    return WorkshopService.isGoogleFormUrl(this.editing?.registrationUrl || '');
  }

  get canSave(): boolean {
    const w = this.editing;
    return !!w && !this.saving
      && !!w.title.trim()
      && !!w.eventDate
      && this.linkValid
      && (!!this.posterFile || !!w.posterUrl);
  }

  save() {
    if (!this.canSave || !this.editing) return;
    this.saving = true;
    const isNew = !this.editing.id;
    this.workshopService
      .saveWorkshop(this.editing, this.posterFile || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        () => {
          this.saving = false;
          this.uiUtil.presentToast(isNew ? 'Workshop added' : 'Workshop saved', 'success');
          this.cancelEdit();
          this.loadData();
        },
        () => {
          this.saving = false;
          this.uiUtil.presentToast("Couldn't save the workshop. Please try again.", 'error');
        }
      );
  }

  confirmDelete(workshop: Workshop) {
    this.uiUtil.presentAlert(
      UI_MESSAGES.CONFIRM_HEADER,
      `Delete "${workshop.title}"? Its poster is deleted too. This can't be undone.`,
      [
        {
          text: UI_MESSAGES.CONFIRM_DELETE_PRIMARY_CTA,
          handler: () => {
            this.workshopService.deleteWorkshop(workshop).pipe(takeUntil(this.destroy$)).subscribe(
              () => {
                this.uiUtil.presentToast('Workshop deleted', 'success');
                if (this.editing?.id === workshop.id) this.cancelEdit();
                this.loadData();
              },
              () => this.uiUtil.presentToast("Couldn't delete the workshop. Please try again.", 'error')
            );
          }
        },
        { text: UI_MESSAGES.CONFIRM_DELETE_SECONDARY_CTA, role: 'cancel' }
      ]
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
