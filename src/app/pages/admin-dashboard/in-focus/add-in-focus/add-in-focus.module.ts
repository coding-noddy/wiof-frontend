import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


import { AddInFocusPageRoutingModule } from './add-in-focus-routing.module';

import { AddInFocusPage } from './add-in-focus.page';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { QuillModule } from 'ngx-quill';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    AddInFocusPageRoutingModule,
    ReactiveFormsModule,
    QuillModule.forRoot(),
    MatFormFieldModule,
    MatInputModule
  ],
  declarations: [AddInFocusPage]
})
export class AddInFocusPageModule {}
