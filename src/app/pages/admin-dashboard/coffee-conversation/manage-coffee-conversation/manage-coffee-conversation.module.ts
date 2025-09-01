import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ManageCoffeeConversationPageRoutingModule } from './manage-coffee-conversation-routing.module';
import { ManageCoffeeConversationPage } from './manage-coffee-conversation.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ManageCoffeeConversationPageRoutingModule
  ],
  declarations: [ManageCoffeeConversationPage]
})
export class ManageCoffeeConversationPageModule {}
