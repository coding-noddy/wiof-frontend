import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OurPurposePage } from './our-purpose.page';

const routes: Routes = [
  {
    path: '',
    component: OurPurposePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OurPurposePageRoutingModule {}
