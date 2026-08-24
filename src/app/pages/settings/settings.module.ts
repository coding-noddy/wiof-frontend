import { NgModule } from '@angular/core';
import { AppCommonModule } from 'src/app/app-common.module';
import { SettingsPageRoutingModule } from './settings-routing.module';
import { SettingsPage } from './settings.page';

@NgModule({
  imports: [AppCommonModule, SettingsPageRoutingModule],
  declarations: [SettingsPage]
})
export class SettingsPageModule {}
