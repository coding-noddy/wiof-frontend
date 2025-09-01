import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AppCommonModule } from '../../app-common.module';

import { PrivacyPolicyPageRoutingModule } from './privacy-policy-routing.module';

import { PrivacyPolicyPage } from './privacy-policy.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    AppCommonModule,
    PrivacyPolicyPageRoutingModule
  ],
  declarations: [PrivacyPolicyPage]
})
export class PrivacyPolicyPageModule {}
