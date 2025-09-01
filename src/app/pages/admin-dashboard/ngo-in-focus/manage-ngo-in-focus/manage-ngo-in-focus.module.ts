import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';

import { ManageNgoInFocusPageRoutingModule } from './manage-ngo-in-focus-routing.module';

import { ManageNgoInFocusPage } from './manage-ngo-in-focus.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatListModule,
    MatToolbarModule,
    ManageNgoInFocusPageRoutingModule
  ],
  declarations: [ManageNgoInFocusPage]
})
export class ManageNgoInFocusPageModule {}
