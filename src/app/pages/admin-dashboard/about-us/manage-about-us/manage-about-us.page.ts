import { OnInit,OnDestroy,Component } from "@angular/core"
import { ActivatedRoute,Router } from "@angular/router";
import { Observable, Subject } from "rxjs"
import { ITEMS, UI_MESSAGES } from "src/app/app.constants";
import { AboutUsProfile, AboutUsService } from "src/app/services/aboutus.service";
import { UiUtilService } from "src/app/util/UiUtilService";

@Component({
    selector:'app-manage-about-us',
    templateUrl:'./manage-about-us.page.html',
    styleUrls:['./manage-about-us.page.scss']
})
export class ManageAboutUsPage implements OnInit , OnDestroy{
    private destroy$:Subject<boolean> = new Subject();
    private aboutUsList$:Observable<AboutUsProfile[]>;

    constructor(
        private aboutUsService:AboutUsService,
        private uiUtil:UiUtilService,
        private router:Router,
        private route:ActivatedRoute
    ){}
    ngOnInit(): void {
        this.pageInit();
    }
    ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
    }
    pageInit():void{
        this.aboutUsList$ = this.aboutUsService.getAboutUsProfiles();
    }
    refreshData():void{
        this.pageInit();
    }
public async deleteAboutUs(personId: string) {
    console.log("The person id in deleteAboutUs method is",personId);
    const UI_MESSAGES_CONFIRM_DELETE_PRIMARY_CTA = 'Confirm Delete'
    this.uiUtil.presentAlert(
        UI_MESSAGES.CONFIRM_HEADER,
        UI_MESSAGES.CONFIRM_DELETE_ITEM_DESC.replace(
            UI_MESSAGES.PLACEHOLDER,
            ITEMS.ABOUT_US
        ),
        [
            {
                // Primary action button (renamed 'text' to 'handler' below)
                // When clicked, it calls the private confirmation function.
                text: UI_MESSAGES_CONFIRM_DELETE_PRIMARY_CTA, // Use the correct CTA text
                handler: async () => {
                    await this.confirmDeleteAboutUs(personId);
                }
            },
            {
                // Secondary action button (Cancel)
                text: UI_MESSAGES.CONFIRM_DELETE_SECONDARY_CTA,
                role: 'cancel'
            }
        ]
    );
}

/**
 * Private function to handle the actual deletion and UI feedback.
 */
private async confirmDeleteAboutUs(personId: string) {
    // 1. Show the loading spinner
    const loader = await this.uiUtil.showLoader(
        UI_MESSAGES.DELETE_IN_PROGRESS.replace(
            UI_MESSAGES.PLACEHOLDER,
            ITEMS.ABOUT_US
        )
    );

    try {
        // 2. Execute the deletion (Promise-based)
       const data= await this.aboutUsService.deleteAboutUsProfile(personId);
        console.log("The data after the delete operation is",data);
        loader.dismiss();
        this.uiUtil.presentAlert(
            UI_MESSAGES.SUCCESS_HEADER,
            UI_MESSAGES.SUCCESS_DELETE_ITEM_DESC.replace(
                UI_MESSAGES.PLACEHOLDER,
                ITEMS.ABOUT_US
            ),
            [UI_MESSAGES.FAILURE_CTA_TEXT]
        );
        this.refreshData(); 

    } catch (error) {
        console.error('Error deleting About Us profile:', error);
        loader.dismiss();
        this.uiUtil.presentAlert(
            UI_MESSAGES.FAILURE_HEADER,
            UI_MESSAGES.FAILURE_DELETE_ITEM_DESC.replace(
                UI_MESSAGES.PLACEHOLDER,
                ITEMS.ABOUT_US
            ),
            [UI_MESSAGES.FAILURE_CTA_TEXT]
        );
    }
}

    viewAboutUsDetails(aboutUsProfile:AboutUsProfile):void{
        this.aboutUsService.setViewEditModeProfile(aboutUsProfile)
        this.router.navigate(['about-us', 'edit'], {
        relativeTo: this.route,
        queryParams: { id: aboutUsProfile.id }
        });
    }

addNewAboutUs(): void {
  this.router.navigate(['about-us', 'new'], { relativeTo: this.route });
}
}
