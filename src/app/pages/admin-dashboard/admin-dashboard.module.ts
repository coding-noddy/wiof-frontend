import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AdminDashboardPageRoutingModule } from './admin-dashboard-routing.module';
import { AdminDashboardPage } from './admin-dashboard.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatToolbarModule,
    AdminDashboardPageRoutingModule
  ],
  declarations: [AdminDashboardPage]
})
export class AdminDashboardPageModule {}
