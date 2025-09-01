import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


import { DiscoverMorePageRoutingModule } from './discover-more-routing.module';

import { DiscoverMorePage } from './discover-more.page';

import { AppCommonModule } from '../../app-common.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    DiscoverMorePageRoutingModule,
    AppCommonModule
  ],
  declarations: [DiscoverMorePage]
})
export class DiscoverMorePageModule {}
