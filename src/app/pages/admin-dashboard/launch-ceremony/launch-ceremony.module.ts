import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { LaunchCeremonyPageRoutingModule } from './launch-ceremony-routing.module';
import { LaunchCeremonyPage } from './launch-ceremony.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    LaunchCeremonyPageRoutingModule
  ],
  declarations: [LaunchCeremonyPage]
})
export class LaunchCeremonyPageModule {}
