import { NgModule } from '@angular/core';
import { AppCommonModule } from 'src/app/app-common.module';
import { MySavedPageRoutingModule } from './my-saved-routing.module';
import { MySavedPage } from './my-saved.page';

@NgModule({
  imports: [AppCommonModule, MySavedPageRoutingModule],
  declarations: [MySavedPage]
})
export class MySavedPageModule {}
