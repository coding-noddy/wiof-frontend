import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { ManageNewsPageRoutingModule } from './manage-news-routing.module';

import { ManageNewsPage } from './manage-news.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    ManageNewsPageRoutingModule
  ],
  declarations: [ManageNewsPage]
})
export class ManageNewsPageModule {}
