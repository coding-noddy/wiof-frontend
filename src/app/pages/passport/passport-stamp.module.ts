import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PassportStampComponent } from './passport-stamp.component';

/** One Passport stamp, shared by the booklet and the app-wide new-badge moment. */
@NgModule({
  imports: [CommonModule],
  declarations: [PassportStampComponent],
  exports: [PassportStampComponent]
})
export class PassportStampModule {}
