import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { HeroVideosPageRoutingModule } from './hero-videos-routing.module';
import { HeroVideosPage } from './hero-videos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    HeroVideosPageRoutingModule
  ],
  declarations: [HeroVideosPage]
})
export class HeroVideosPageModule {}
