import { NgModule } from '@angular/core';
import { AppCommonModule } from 'src/app/app-common.module';
import { MyLibraryPageRoutingModule } from './my-library-routing.module';
import { MyLibraryPage } from './my-library.page';

@NgModule({
  imports: [AppCommonModule, MyLibraryPageRoutingModule],
  declarations: [MyLibraryPage]
})
export class MyLibraryPageModule {}
