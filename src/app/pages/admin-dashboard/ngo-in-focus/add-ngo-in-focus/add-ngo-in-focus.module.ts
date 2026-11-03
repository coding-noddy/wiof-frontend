import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AddNgoInFocusPageRoutingModule } from './add-ngo-in-focus-routing.module';

import { AddNgoInFocusPage } from './add-ngo-in-focus.page';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { FileInputValueAccessorDirective } from '../../../../directives/file-input-value-accessor.directive';
@NgModule({
  imports: [
    FileInputValueAccessorDirective,
    CommonModule,
    FormsModule,
    IonicModule,
    AddNgoInFocusPageRoutingModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  declarations: [AddNgoInFocusPage]
})
export class AddNgoInFocusPageModule {}
