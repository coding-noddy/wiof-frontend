import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatGridListModule } from '@angular/material/grid-list';
import { LayoutModule } from '@angular/cdk/layout';
import { AppCommonModule } from 'src/app/app-common.module';
import { HomePageRoutingModule } from './home-routing.module';
import { HomePage } from './home.page';
import { NgoInFocusComponent } from '../../components/ngo/ngo-in-focus.component';
import { CourseInFocusComponent } from '../../components/course-in-focus/course-in-focus.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HomePageRoutingModule,
    AppCommonModule,
    MatGridListModule,
    LayoutModule
  ],
  declarations: [HomePage, NgoInFocusComponent, CourseInFocusComponent]
})
export class HomePageModule {}
