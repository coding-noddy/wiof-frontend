import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AqiScorecardComponent } from './components/aqi-scorecard/aqi-scorecard.component';
import { ConcentPopupComponent } from './components/concent-popup/concent-popup.component';
import { AqiWidgetComponent } from './components/aqi-widget/aqi-widget.component';
import { BlogCardComponent } from './components/blog-card/blog-card.component';
import { BlogSliderComponent } from './components/blog-slider/blog-slider.component';
import { BackButtonComponent } from './components/back-button/back-button.component';
import { SocialShareComponent } from './components/social-share/social-share.component';
import { ElementWelcomeImageComponent } from './components/element-welcome-image/element-welcome-image.component';
import { EnergyWidgetComponent } from './components/energy-widget/energy-widget.component';
import { EQWidgetComponent } from './components/eq-widget/eq-widget.component';
import { EqWidgetResultComponent } from './components/eq-widget-result/eq-widget-result.component';
import { EqWidgetTestComponent } from './components/eq-widget-test/eq-widget-test.component';
import { EqWidgetQuestionCardComponent } from './components/eq-widget-question-card/eq-widget-question-card.component';
import { FoodPhIndicatorMeterComponent } from './components/food-ph-indicator-meter/food-ph-indicator-meter.component';
import { FoodPhIndicatorComponent } from './components/food-ph-indicator/food-ph-indicator.component';
import { HeaderComponent } from './components/header/header.component';
import { LifeElementsComponent } from './components/life-elements/life-elements.component';
import { EnvCalenderComponent } from './components/env-calender/env-calender.component';
import { PollResultComponent } from './components/poll-result/poll-result.component';
import { PollsWidgetComponent } from './components/polls-widget/polls-widget.component';
import { SubscribeComponent } from './components/subscribe/subscribe.component';
import { VideoSliderComponent } from './components/video-slider/video-slider.component';
import { VideoWidgetComponent } from './components/video-widget/video-widget.component';
import { WaterWidgetComponent } from './components/water-widget/water-widget.component';
import { WiofFooterComponent } from './components/wiof-footer/wiof-footer.component';
import { WiofSpinnerComponent } from './components/wiof-spinner/wiof-spinner.component';
import { VideoCardComponent } from './components/video-card/video-card.component';
import { BreakingNewsComponent } from './components/breaking-news/breaking-news.component';
import { SocialShareHomeComponent } from './components/social-share-home/social-share-home.component';
import { EnvCalDialogComponent } from './components/env-cal-dialog/env-cal-dialog.component';
import { TakeActionContentComponent } from './components/take-action-content/take-action-content.component';
import { CoffeeConversationComponent } from './components/coffee-conversation/coffee-conversation.component';
import { InFocusWidgetComponent } from './components/in-focus-widget/in-focus-widget.component';
import { PurposeSectionComponent } from './components/purpose-section/purpose-section.component';

const COMPONENTS = [
  HeaderComponent,
  LifeElementsComponent,
  WiofFooterComponent,
  VideoSliderComponent,
  BlogSliderComponent,
  BlogCardComponent,
  ConcentPopupComponent,
  ElementWelcomeImageComponent,
  EnvCalenderComponent,
  AqiWidgetComponent,
  SubscribeComponent,
  WaterWidgetComponent,
  VideoWidgetComponent,
  EQWidgetComponent,
  EqWidgetResultComponent,
  EqWidgetQuestionCardComponent,
  SubscribeComponent,
  PollsWidgetComponent,
  FoodPhIndicatorComponent,
  EnergyWidgetComponent,
  AqiScorecardComponent,
  FoodPhIndicatorMeterComponent,
  PollResultComponent,
  WiofSpinnerComponent,
  BackButtonComponent,
  SocialShareComponent,
  VideoCardComponent,
  BreakingNewsComponent,
  EqWidgetTestComponent,
  SocialShareHomeComponent,
  EnvCalDialogComponent,
  TakeActionContentComponent,
  CoffeeConversationComponent,
  InFocusWidgetComponent,
  PurposeSectionComponent
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatToolbarModule
  ],
  exports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatToolbarModule,
    ...COMPONENTS
  ],
  declarations: [...COMPONENTS],
  providers: []
})
export class AppCommonModule {}
