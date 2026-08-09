import { OnInit, OnDestroy, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ITEMS, UI_MESSAGES } from 'src/app/app.constants';
import { AboutUsProfile, AboutUsService } from 'src/app/services/aboutus.service';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { AngularFireStorage } from '@angular/fire/compat/storage';

@Component({
  selector: 'app-manage-about-us',
  templateUrl: './manage-about-us.page.html',
  styleUrls: ['./manage-about-us.page.scss']
})
export class ManageAboutUsPage implements OnInit, OnDestroy {
  private destroy$: Subject<boolean> = new Subject();
  allItems: AboutUsProfile[] = [];
  displayedItems: AboutUsProfile[] = [];
  sortColumn = 'serialNo';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  imageUrls: { [key: string]: string } = {};

  constructor(private aboutUsService: AboutUsService, private uiUtil: UiUtilService, private router: Router, private route: ActivatedRoute, private storage: AngularFireStorage) {}

  ngOnInit(): void { this.loadData(); }
  ngOnDestroy(): void { this.destroy$.next(true); this.destroy$.unsubscribe(); }

  loadData(): void {
    this.aboutUsService.getAboutUsProfiles().pipe(takeUntil(this.destroy$)).subscribe(list => {
      this.allItems = list;
      list.forEach(p => this.loadImage(p));
      this.applySort();
    });
  }

  private loadImage(profile: AboutUsProfile) {
    if (!profile.imageLink || this.imageUrls[profile.id]) return;
    // imageLink could be a full URL already or just a filename
    if (profile.imageLink.startsWith('http')) {
      this.imageUrls[profile.id] = profile.imageLink;
    } else {
      this.storage.ref(`about-us/${profile.imageLink}`).getDownloadURL().pipe(takeUntil(this.destroy$)).subscribe(
        url => this.imageUrls[profile.id] = url,
        () => {} // ignore errors for missing images
      );
    }
  }

  applySort() {
    const sorted = [...this.allItems].sort((a, b) => {
      let valA = a[this.sortColumn]; let valB = b[this.sortColumn];
      if (valA == null) valA = ''; if (valB == null) valB = '';
      if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = (valB as string).toLowerCase(); }
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    this.totalPages = Math.ceil(sorted.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = 1;
    const start = (this.currentPage - 1) * this.pageSize;
    this.displayedItems = sorted.slice(start, start + this.pageSize);
  }

  sortBy(column: string) { if (this.sortColumn === column) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'; else { this.sortColumn = column; this.sortDirection = 'asc'; } this.currentPage = 1; this.applySort(); }
  goToPage(p: number) { if (p >= 1 && p <= this.totalPages) { this.currentPage = p; this.applySort(); } }
  onPageSizeChange() { this.currentPage = 1; this.applySort(); }
  get pageNumbers(): number[] { const pages = []; let s = Math.max(1, this.currentPage - 2); let e = Math.min(this.totalPages, s + 4); if (e - s < 4) s = Math.max(1, e - 4); for (let i = s; i <= e; i++) pages.push(i); return pages; }
  refreshData(): void { this.loadData(); }

  public async deleteAboutUs(personId: string) {
    this.uiUtil.presentAlert(UI_MESSAGES.CONFIRM_HEADER, UI_MESSAGES.CONFIRM_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.ABOUT_US),
      [{ text: 'Confirm Delete', handler: async () => {
        const loader = await this.uiUtil.showLoader(UI_MESSAGES.DELETE_IN_PROGRESS.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.ABOUT_US));
        try {
          await this.aboutUsService.deleteAboutUsProfile(personId);
          loader.dismiss();
          this.uiUtil.presentAlert(UI_MESSAGES.SUCCESS_HEADER, UI_MESSAGES.SUCCESS_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.ABOUT_US), [UI_MESSAGES.FAILURE_CTA_TEXT]);
          this.loadData();
        } catch (error) {
          loader.dismiss();
          this.uiUtil.presentAlert(UI_MESSAGES.FAILURE_HEADER, UI_MESSAGES.FAILURE_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.ABOUT_US), [UI_MESSAGES.FAILURE_CTA_TEXT]);
        }
      }}, { text: UI_MESSAGES.CONFIRM_DELETE_SECONDARY_CTA, role: 'cancel' }]);
  }

  viewAboutUsDetails(profile: AboutUsProfile): void {
    this.aboutUsService.setViewEditModeProfile(profile);
    this.router.navigate(['about-us', 'edit'], { relativeTo: this.route, queryParams: { id: profile.id } });
  }

  addNewAboutUs(): void { this.router.navigate(['about-us', 'new'], { relativeTo: this.route }); }
}
