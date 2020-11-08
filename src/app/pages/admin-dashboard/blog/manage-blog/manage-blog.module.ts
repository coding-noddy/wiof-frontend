import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { ManageBlogPageRoutingModule } from "./manage-blog-routing.module";

import { ManageBlogPage } from "./manage-blog.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ManageBlogPageRoutingModule
  ],
  declarations: [ManageBlogPage]
})
export class ManageBlogPageModule {}
