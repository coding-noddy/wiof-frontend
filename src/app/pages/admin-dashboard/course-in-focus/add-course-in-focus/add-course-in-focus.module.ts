import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


import { AddCourseInFocusPageRoutingModule } from './add-course-in-focus-routing.module';

import { AddCourseInFocusPage } from './add-course-in-focus.page';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    AddCourseInFocusPageRoutingModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  declarations: [AddCourseInFocusPage]
})
export class AddCourseInFocusPageModule {}
