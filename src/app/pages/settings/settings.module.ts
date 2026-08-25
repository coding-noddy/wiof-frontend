import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppCommonModule } from 'src/app/app-common.module';
import { SettingsPageRoutingModule } from './settings-routing.module';
import { SettingsPage } from './settings.page';

@NgModule({
  imports: [AppCommonModule, SettingsPageRoutingModule, FormsModule],
  declarations: [SettingsPage]
})
export class SettingsPageModule {}
