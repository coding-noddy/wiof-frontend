import { NgModule } from '@angular/core';
import { AppCommonModule } from 'src/app/app-common.module';
import { SlidersModule } from 'src/app/sliders.module';
import { EarthPageRoutingModule } from './earth-routing.module';
import { EarthPage } from './earth.page';

@NgModule({
  imports: [AppCommonModule, SlidersModule, EarthPageRoutingModule],
  declarations: [EarthPage]
})
export class EarthPageModule {}
