import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NgoPageRoutingModule } from './ngo-routing.module';

import { NgoPage } from './ngo.page';

@NgModule({
  imports: [CommonModule, FormsModule, NgoPageRoutingModule],
  declarations: [NgoPage]
})
export class NgoPageModule {}
