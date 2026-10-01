import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ManageTakeActionPage } from './manage-take-action.page';

const routes: Routes = [
  { path: '', component: ManageTakeActionPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ManageTakeActionPageRoutingModule {}
