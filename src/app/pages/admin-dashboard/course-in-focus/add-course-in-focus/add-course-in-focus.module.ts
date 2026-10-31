import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AddCourseInFocusPageRoutingModule } from './add-course-in-focus-routing.module';

import { AddCourseInFocusPage } from './add-course-in-focus.page';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

import { FileInputValueAccessorDirective } from '../../../../directives/file-input-value-accessor.directive';
@NgModule({
  imports: [
    FileInputValueAccessorDirective,
    CommonModule,
    FormsModule,
    IonicModule,
    AddCourseInFocusPageRoutingModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  declarations: [AddCourseInFocusPage]
})
export class AddCourseInFocusPageModule {}
