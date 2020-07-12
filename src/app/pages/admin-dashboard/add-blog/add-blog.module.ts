import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { QuillModule } from "ngx-quill";
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
    QuillModule.forRoot(),
  ],
  declarations: [AddBlogPage],
})
export class AddBlogPageModule {}
