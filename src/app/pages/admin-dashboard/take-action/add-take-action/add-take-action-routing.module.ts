import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddTakeActionPage } from './add-take-action.page';

const routes: Routes = [
  { path: '', component: AddTakeActionPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AddTakeActionPageRoutingModule {}
