import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatDatepickerModule,
  MatDatepicker,
  MatDatepickerToggle
} from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AddPollPageRoutingModule } from './add-poll-routing.module';
import { AddPollPage } from './add-poll.page';
import { MatNativeDateModule } from '@angular/material/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AddPollPageRoutingModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatDatepickerModule
  ],
  declarations: [AddPollPage]
})
export class AddPollPageModule {}
