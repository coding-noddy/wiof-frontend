import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppCommonModule } from 'src/app/app-common.module';
import { VideoPostPageRoutingModule } from './video-post-routing.module';
import { VideoPostPage } from './video-post.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    VideoPostPageRoutingModule,
    AppCommonModule
  ],
  declarations: [VideoPostPage]
})
export class VideoPostPageModule {}
