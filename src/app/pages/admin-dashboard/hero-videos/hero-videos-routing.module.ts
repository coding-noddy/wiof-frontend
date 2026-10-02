import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HeroVideosPage } from './hero-videos.page';

const routes: Routes = [
  { path: '', component: HeroVideosPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HeroVideosPageRoutingModule {}
