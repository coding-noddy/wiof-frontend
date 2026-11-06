import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppCommonModule } from 'src/app/app-common.module';
import { PassportStampComponent } from './passport-stamp.component';
import { PassportPage } from './passport.page';

@NgModule({
  imports: [AppCommonModule, RouterModule.forChild([{ path: '', component: PassportPage }])],
  declarations: [PassportPage, PassportStampComponent]
})
export class PassportPageModule {}
