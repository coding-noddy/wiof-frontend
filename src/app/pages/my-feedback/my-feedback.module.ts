import { NgModule } from '@angular/core';
import { AppCommonModule } from 'src/app/app-common.module';
import { MyFeedbackPageRoutingModule } from './my-feedback-routing.module';
import { MyFeedbackPage } from './my-feedback.page';

@NgModule({
  imports: [AppCommonModule, MyFeedbackPageRoutingModule],
  declarations: [MyFeedbackPage]
})
export class MyFeedbackPageModule {}
