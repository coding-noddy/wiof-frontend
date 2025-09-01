import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ManagePollsPageRoutingModule } from './manage-polls-routing.module';
import { ManagePollsPage } from './manage-polls.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatListModule,
    MatToolbarModule,
    ManagePollsPageRoutingModule
  ],
  declarations: [ManagePollsPage]
})
export class ManagePollsPageModule {}
