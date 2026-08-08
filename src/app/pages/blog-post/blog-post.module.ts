import { NgModule } from '@angular/core';
import { AppCommonModule } from 'src/app/app-common.module';
import { QuillModule } from 'ngx-quill';
import { BlogPostPageRoutingModule } from './blog-post-routing.module';
import { BlogPostPage } from './blog-post.page';

@NgModule({
  imports: [AppCommonModule, BlogPostPageRoutingModule, QuillModule.forRoot()],
  declarations: [BlogPostPage]
})
export class BlogPostPageModule {}
