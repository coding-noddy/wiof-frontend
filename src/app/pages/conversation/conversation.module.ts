import { NgModule } from '@angular/core';
import { AppCommonModule } from 'src/app/app-common.module';
import { ConversationPageRoutingModule } from './conversation-routing.module';
import { ConversationPage } from './conversation.page';

@NgModule({
  imports: [AppCommonModule, ConversationPageRoutingModule],
  declarations: [ConversationPage]
})
export class ConversationPageModule {}
