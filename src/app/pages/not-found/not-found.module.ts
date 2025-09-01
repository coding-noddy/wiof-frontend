import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotFoundPageRoutingModule } from './not-found-routing.module';
import { NotFoundPage } from './not-found.page';
import { AppCommonModule } from 'src/app/app-common.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NotFoundPageRoutingModule,
    AppCommonModule
  ],
  declarations: [NotFoundPage]
})
export class NotFoundPageModule {}
