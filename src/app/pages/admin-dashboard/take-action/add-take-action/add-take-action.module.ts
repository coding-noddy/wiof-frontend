import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppCommonModule } from 'src/app/app-common.module';
import { AddTakeActionPageRoutingModule } from './add-take-action-routing.module';
import { AddTakeActionPage } from './add-take-action.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    AddTakeActionPageRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    AppCommonModule
  ],
  declarations: [AddTakeActionPage]
})
export class AddTakeActionPageModule {}
