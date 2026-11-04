import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EarthPage } from './earth.page';

// The element's blog/video/take-action pages are routed in AppRoutingModule.
const routes: Routes = [
  {
    path: '',
    component: EarthPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EarthPageRoutingModule {}
