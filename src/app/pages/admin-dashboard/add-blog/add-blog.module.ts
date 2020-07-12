import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { AddBlogPageRoutingModule } from "./add-blog-routing.module";
import { AddBlogPage } from "./add-blog.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddBlogPageRoutingModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  declarations: [AddBlogPage],
})
export class AddBlogPageModule {}
