import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ManageBlogPage } from './manage-blog.page';

const routes: Routes = [
  {
    path: '',
    component: ManageBlogPage
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ManageBlogPageRoutingModule {}
