import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LaunchCeremonyPage } from './launch-ceremony.page';

const routes: Routes = [
  { path: '', component: LaunchCeremonyPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LaunchCeremonyPageRoutingModule {}
