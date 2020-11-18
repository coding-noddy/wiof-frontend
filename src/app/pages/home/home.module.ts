import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { AppCommonModule } from "src/app/app-common.module";
import { HomePageRoutingModule } from "./home-routing.module";
import { HomePage } from "./home.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    AppCommonModule
  ],
  declarations: [HomePage]
})
export class HomePageModule {}