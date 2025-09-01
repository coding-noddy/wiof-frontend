import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { QuillModule } from 'ngx-quill';
import { AddNewsPageRoutingModule } from './add-news-routing.module';
import { AddNewsPage } from './add-news.page';

@NgModule({
  imports: [
    CommonModule,
    AddNewsPageRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    QuillModule.forRoot(),
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatDatepickerModule
  ],
  declarations: [AddNewsPage]
})
export class AddNewsPageModule {}
