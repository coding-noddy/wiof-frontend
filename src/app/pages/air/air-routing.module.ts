import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AirPage } from './air.page';

// The element's blog/video/take-action pages are routed in AppRoutingModule.
const routes: Routes = [
  {
    path: '',
    component: AirPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AirPageRoutingModule {}
