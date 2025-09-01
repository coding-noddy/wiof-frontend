import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

import { SubscribersPageRoutingModule } from './subscribers-routing.module';

import { SubscribersPage } from './subscribers.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    SubscribersPageRoutingModule
  ],
  declarations: [SubscribersPage]
})
export class SubscribersPageModule {}
