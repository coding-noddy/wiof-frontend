import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EnergyPage } from './energy.page';

// The element's blog/video/take-action pages are routed in AppRoutingModule.
const routes: Routes = [
  {
    path: '',
    component: EnergyPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EnergyPageRoutingModule {}
