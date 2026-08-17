import { NgModule } from '@angular/core';
import { AppCommonModule } from 'src/app/app-common.module';
import { MyJourneyPageRoutingModule } from './my-journey-routing.module';
import { MyJourneyPage } from './my-journey.page';

@NgModule({
  imports: [AppCommonModule, MyJourneyPageRoutingModule],
  declarations: [MyJourneyPage]
})
export class MyJourneyPageModule {}
