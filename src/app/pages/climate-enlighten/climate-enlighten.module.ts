import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ClimateEnlightenComponent } from './climate-enlighten.component';

const routes: Routes = [
  { path: '', component: ClimateEnlightenComponent }
];

@NgModule({
  declarations: [ClimateEnlightenComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class ClimateEnlightenPageModule { }