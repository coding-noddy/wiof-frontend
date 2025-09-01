import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AddOccasionPageRoutingModule } from './add-occasion-routing.module';

import { AddOccasionPage } from './add-occasion.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    AddOccasionPageRoutingModule
  ],
  declarations: [AddOccasionPage]
})
export class AddOccasionPageModule {}
