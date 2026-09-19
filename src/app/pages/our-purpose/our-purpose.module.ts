import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { OurPurposePageRoutingModule } from './our-purpose-routing.module';

import { OurPurposePage } from './our-purpose.page';

import { AppCommonModule } from '../../app-common.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OurPurposePageRoutingModule,
    AppCommonModule
  ],
  declarations: [OurPurposePage]
})
export class OurPurposePageModule {}
