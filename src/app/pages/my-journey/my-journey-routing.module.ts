import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MyJourneyPage } from './my-journey.page';

const routes: Routes = [
  {
    path: '',
    component: MyJourneyPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MyJourneyPageRoutingModule {}
