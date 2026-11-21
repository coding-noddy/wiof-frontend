import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { PassportStampModule } from 'src/app/pages/passport/passport-stamp.module';
import { PassportAdminPage } from './passport-admin.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, PassportStampModule, RouterModule.forChild([{ path: '', component: PassportAdminPage }])],
  declarations: [PassportAdminPage]
})
export class PassportAdminPageModule {}