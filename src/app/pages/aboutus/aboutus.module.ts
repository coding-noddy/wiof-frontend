import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppCommonModule } from 'src/app/app-common.module';

import { AboutusPageRoutingModule } from './aboutus-routing.module';

import { AboutusPage } from './aboutus.page';

@NgModule({
  imports: [
    CommonModule,
    AppCommonModule,
    FormsModule,
    AboutusPageRoutingModule
  ],
  declarations: [AboutusPage]
})
export class AboutusPageModule {}
