import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IonicModule } from '@ionic/angular';
import { NgChartsModule } from 'ng2-charts';

import { AnalyticsPageRoutingModule } from './analytics-routing.module';

import { AnalyticsPage } from './analytics.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    NgChartsModule,
    AnalyticsPageRoutingModule
  ],
  declarations: [AnalyticsPage]
})
export class AnalyticsPageModule {}
