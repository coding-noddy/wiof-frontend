import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Observable, throwError, of } from 'rxjs';
import { NgoInFocus } from 'src/app/models/NgoInFocus';
import { NgoInFocusService } from 'src/app/services/ngo-in-focus.service';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntil, catchError, map, switchMap } from 'rxjs/operators';
import { UI_MESSAGES, ITEMS, MEDIA_TYPE } from 'src/app/app.constants';

@Component({
  selector: 'app-manage-ngo-in-focus',
  templateUrl: './manage-ngo-in-focus.page.html',
  styleUrls: ['./manage-ngo-in-focus.page.scss']
})
export class ManageNgoInFocusPage implements OnInit, OnDestroy {
  destroy$: Subject<boolean> = new Subject();
  ngoInFocusList$: Observable<NgoInFocus[]>;

  constructor(
    private ngoInFocusService: NgoInFocusService,
    private uiUtil: UiUtilService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.initPage();
  }

  initPage() {
    this.ngoInFocusList$ = this.ngoInFocusService.getNgosInFocus().pipe(
      takeUntil(this.destroy$),
      map((data) =>
        data.sort((a, b) => (a.submitDate < b.submitDate ? -1 : 1))
      ),
      catchError((err) => {
        return throwError(err);
      })
    );
  }

  refreshData() {
    this.initPage();
  }

  addNgoInFocus() {
    this.router.navigate(['ngo-in-focus', 'new'], {
      relativeTo: this.route
    });
  }

  viewNgoInFocusDetails(ngoInFocus: NgoInFocus) {
    this.ngoInFocusService.setViewEditModeNgoInFocus(ngoInFocus);
    this.router.navigate(['ngo-in-focus', 'edit'], {
      relativeTo: this.route,
      queryParams: { id: ngoInFocus.id }
    });
  }

  deleteNgoInFocus(
    ngoInFocusList: NgoInFocus[],
    index: number,
    ngoInFocus: NgoInFocus
  ) {
    this.uiUtil.presentAlert(
      UI_MESSAGES.CONFIRM_HEADER,
      UI_MESSAGES.CONFIRM_DELETE_ITEM_DESC.replace(
        UI_MESSAGES.PLACEHOLDER,
        ITEMS.NGO_IN_FOCUS
      ),
      [
        {
          text: UI_MESSAGES.CONFIRM_DELETE_PRIMARY_CTA,
          handler: async () => {
            await this.delNgoInFocus(ngoInFocusList, index, ngoInFocus);
          }
        },
        {
          text: UI_MESSAGES.CONFIRM_DELETE_SECONDARY_CTA,
          role: 'cancel'
        }
      ]
    );
  }

  private async delNgoInFocus(
    ngoInFocusList: NgoInFocus[],
    index: number,
    ngoInFocus: NgoInFocus
  ) {
    const loader = await this.uiUtil.showLoader(
      UI_MESSAGES.DELETE_IN_PROGRESS.replace(
        UI_MESSAGES.PLACEHOLDER,
        ITEMS.NGO_IN_FOCUS
      )
    );
    // Start with deleting the Firestore document first (most important)
    // Then attempt image cleanup (non-blocking if images don't exist)
    this.ngoInFocusService
      .deleteNgoInFocus(ngoInFocus.id)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          // Try to delete logo — ignore errors if it doesn't exist
          if (ngoInFocus.ngoLogo) {
            return this.ngoInFocusService.deleteNgoInFocusImage(ngoInFocus.ngoLogo).pipe(
              catchError(() => of(true))
            );
          }
          return of(true);
        }),
        switchMap(() => {
          // Try to delete media image — ignore errors if it doesn't exist
          if (ngoInFocus.mediaType === MEDIA_TYPE.IMAGE && ngoInFocus.mediaLink) {
            return this.ngoInFocusService.deleteNgoInFocusImage(ngoInFocus.mediaLink).pipe(
              catchError(() => of(true))
            );
          }
          return of(true);
        })
      )
      .subscribe(
        (response) => {
          loader.dismiss();
          this.uiUtil.presentAlert(
            UI_MESSAGES.SUCCESS_HEADER,
            UI_MESSAGES.SUCCESS_DELETE_ITEM_DESC.replace(
              UI_MESSAGES.PLACEHOLDER,
              ITEMS.NGO_IN_FOCUS
            ),
            [UI_MESSAGES.FAILURE_CTA_TEXT]
          );
          ngoInFocusList.splice(index, 1);
        },
        (error) => {
          console.error('Delete failed:', error);
          loader.dismiss();
          this.uiUtil.presentAlert(
            UI_MESSAGES.FAILURE_HEADER,
            UI_MESSAGES.FAILURE_DELETE_ITEM_DESC.replace(
              UI_MESSAGES.PLACEHOLDER,
              ITEMS.NGO_IN_FOCUS
            ),
            [UI_MESSAGES.FAILURE_CTA_TEXT]
          );
        }
      );
  }

  publishNgoInFocus(id: string, category: string) {
    this.ngoInFocusService.publishNgoInFocus(id, category).subscribe((data) => {
      this.uiUtil.presentAlert(
        UI_MESSAGES.SUCCESS_HEADER,
        UI_MESSAGES.SUCCESS_PUBLISH_ITEM_DESC.replace(
          UI_MESSAGES.PLACEHOLDER,
          ITEMS.NGO_IN_FOCUS
        ),
        [UI_MESSAGES.FAILURE_CTA_TEXT]
      );
      this.refreshData();
    });
  }

  unpublishSingleNgoInFocus(ngoInFocus: NgoInFocus) {
    this.ngoInFocusService.unpublishSingleItem(ngoInFocus.id).subscribe(() => {
      this.uiUtil.presentAlert(
        UI_MESSAGES.SUCCESS_HEADER,
        UI_MESSAGES.SUCCESS_UNPUBLISH_ITEM_DESC.replace(
          UI_MESSAGES.PLACEHOLDER,
          ITEMS.NGO_IN_FOCUS
        ),
        [UI_MESSAGES.FAILURE_CTA_TEXT]
      );
      this.refreshData();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
