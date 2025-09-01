import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';

import { ManageInFocusPageRoutingModule } from './manage-in-focus-routing.module';

import { ManageInFocusPage } from './manage-in-focus.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    ManageInFocusPageRoutingModule
  ],
  declarations: [ManageInFocusPage]
})
export class ManageInFocusPageModule {}
