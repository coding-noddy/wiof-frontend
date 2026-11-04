import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppCommonModule } from 'src/app/app-common.module';
import { SlidersModule } from 'src/app/sliders.module';
import { AirPageRoutingModule } from './air-routing.module';
import { AirPage } from './air.page';

@NgModule({
  imports: [
    CommonModule,
    AppCommonModule,
    SlidersModule,
    IonicModule,
    AirPageRoutingModule,
    FormsModule
  ],
  declarations: [AirPage]
})
export class AirPageModule {}
