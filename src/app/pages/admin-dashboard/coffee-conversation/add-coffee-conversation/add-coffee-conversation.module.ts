import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { QuillModule } from 'ngx-quill';
import { AddCoffeeConversationPageRoutingModule } from './add-coffee-conversation-routing.module';
import { AddCoffeeConversationPage } from './add-coffee-conversation.page';

@NgModule({
  imports: [
    CommonModule,
    AddCoffeeConversationPageRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    QuillModule.forRoot(),
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatDatepickerModule
  ],
  declarations: [AddCoffeeConversationPage]
})
export class AddCoffeeConversationPageModule {}
