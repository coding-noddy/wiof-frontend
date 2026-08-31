import { NgModule } from '@angular/core';
import { AppCommonModule } from 'src/app/app-common.module';
import { EnergyPageRoutingModule } from './energy-routing.module';
import { EnergyPage } from './energy.page';

@NgModule({
  imports: [AppCommonModule, EnergyPageRoutingModule],
  declarations: [EnergyPage]
})
export class EnergyPageModule {}
