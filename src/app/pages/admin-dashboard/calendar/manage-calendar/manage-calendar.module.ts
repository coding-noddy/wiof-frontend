import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ManageCalendarPageRoutingModule } from './manage-calendar-routing.module';

import { ManageCalendarPage } from './manage-calendar.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ManageCalendarPageRoutingModule
  ],
  declarations: [ManageCalendarPage]
})
export class ManageCalendarPageModule {}
