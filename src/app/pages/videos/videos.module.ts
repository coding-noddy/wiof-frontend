import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


import { VideosPageRoutingModule } from './videos-routing.module';

import { VideosPage } from './videos.page';
import { AppCommonModule } from 'src/app/app-common.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    VideosPageRoutingModule,
    AppCommonModule
  ],
  declarations: [VideosPage]
})
export class VideosPageModule {}
