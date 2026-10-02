import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ManageTakeActionPageRoutingModule } from './manage-take-action-routing.module';
import { ManageTakeActionPage } from './manage-take-action.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ManageTakeActionPageRoutingModule
  ],
  declarations: [ManageTakeActionPage]
})
export class ManageTakeActionPageModule {}
