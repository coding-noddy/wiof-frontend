import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';

import { ManageCourseInFocusPageRoutingModule } from './manage-course-in-focus-routing.module';

import { ManageCourseInFocusPage } from './manage-course-in-focus.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatToolbarModule,
    ManageCourseInFocusPageRoutingModule
  ],
  declarations: [ManageCourseInFocusPage]
})
export class ManageCourseInFocusPageModule {}
