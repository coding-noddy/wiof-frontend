import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppCommonModule } from 'src/app/app-common.module';
import { TakeActionPageRoutingModule } from './take-action-routing.module';
import { TakeActionPage } from './take-action.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TakeActionPageRoutingModule,
    AppCommonModule
  ],
  declarations: [TakeActionPage]
})
export class TakeActionPageModule {}
