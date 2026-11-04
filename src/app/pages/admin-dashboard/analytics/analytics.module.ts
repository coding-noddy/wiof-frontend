import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IonicModule } from '@ionic/angular';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { AnalyticsPageRoutingModule } from './analytics-routing.module';

import { AnalyticsPage } from './analytics.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    BaseChartDirective,
    AnalyticsPageRoutingModule
  ],
  declarations: [AnalyticsPage],
  // ng2-charts 6+ no longer registers Chart.js's chart types itself.
  providers: [provideCharts(withDefaultRegisterables())]
})
export class AnalyticsPageModule {}
