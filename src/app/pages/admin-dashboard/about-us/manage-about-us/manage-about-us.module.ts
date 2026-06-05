import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { ManageAboutUsPageRoutingModule } from "./manage-about-us-routing.module";
import { ManageAboutUsPage } from "./manage-about-us.page";

@NgModule({
    imports:[
        CommonModule,
        FormsModule,
        IonicModule,
        ManageAboutUsPageRoutingModule
    ],
    declarations:[ManageAboutUsPage]
})

export class ManageAboutUsPageModule{}