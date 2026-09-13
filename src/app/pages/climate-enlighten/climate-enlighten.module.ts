import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AppCommonModule } from 'src/app/app-common.module';
import { ClimateEnlightenComponent } from './climate-enlighten.component';

const routes: Routes = [
  { path: '', component: ClimateEnlightenComponent }
];

@NgModule({
  declarations: [ClimateEnlightenComponent],
  imports: [
    CommonModule,
    IonicModule,
    AppCommonModule,
    RouterModule.forChild(routes)
  ]
})
export class ClimateEnlightenPageModule { }