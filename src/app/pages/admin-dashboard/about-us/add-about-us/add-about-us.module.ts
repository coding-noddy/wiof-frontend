import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { QuillModule } from 'ngx-quill';
import { AddAboutUsPageRoutingModule } from './add-about-us-routing.module';
import { AddAboutUsPage } from './add-about-us.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    AddAboutUsPageRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    QuillModule.forRoot()
  ],
  declarations: [AddAboutUsPage]
})
export class AddAboutUsPageModule {}