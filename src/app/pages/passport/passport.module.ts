import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppCommonModule } from 'src/app/app-common.module';
import { PassportStampModule } from './passport-stamp.module';
import { PassportPage } from './passport.page';

@NgModule({
  imports: [AppCommonModule, PassportStampModule, RouterModule.forChild([{ path: '', component: PassportPage }])],
  declarations: [PassportPage]
})
export class PassportPageModule {}
