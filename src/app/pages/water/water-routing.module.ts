import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WaterPage } from './water.page';

// The element's blog/video/take-action pages are routed in AppRoutingModule.
const routes: Routes = [
  {
    path: '',
    component: WaterPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WaterPageRoutingModule {}
