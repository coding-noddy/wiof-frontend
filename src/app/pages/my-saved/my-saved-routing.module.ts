import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MySavedPage } from './my-saved.page';

const routes: Routes = [
  {
    path: '',
    component: MySavedPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MySavedPageRoutingModule {}
