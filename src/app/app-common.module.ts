import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AqiScorecardComponent } from './components/aqi-scorecard/aqi-scorecard.component';
import { AqiWidgetComponent } from './components/aqi-widget/aqi-widget.component';
import { BlogCardComponent } from './components/blog-card/blog-card.component';
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
import { EnvCalendarAgendaComponent } from './components/env-calendar-agenda/env-calendar-agenda.component';
import { PollResultComponent } from './components/poll-result/poll-result.component';
import { PollsWidgetComponent } from './components/polls-widget/polls-widget.component';
import { SubscribeComponent } from './components/subscribe/subscribe.component';
import { VideoWidgetComponent } from './components/video-widget/video-widget.component';
import { WaterWidgetComponent } from './components/water-widget/water-widget.component';
import { WiofFooterComponent } from './components/wiof-footer/wiof-footer.component';
import { FeedbackDialogComponent } from './components/feedback-dialog/feedback-dialog.component';
import { SearchBoxComponent } from './components/search-box/search-box.component';
import { WiofSpinnerComponent } from './components/wiof-spinner/wiof-spinner.component';
import { VideoCardComponent } from './components/video-card/video-card.component';
import { EnvCalDialogComponent } from './components/env-cal-dialog/env-cal-dialog.component';
import { SectionNavComponent } from './components/section-nav/section-nav.component';
import { AvatarDropdownComponent } from './components/avatar-dropdown/avatar-dropdown.component';
import { BookmarkIconComponent } from './components/bookmark-icon/bookmark-icon.component';
import { HomeJourneyPanelComponent } from './components/home-journey-panel/home-journey-panel.component';
import { ElementTakeActionTeaserComponent } from './components/element-take-action-teaser/element-take-action-teaser.component';
import { TakeActionCardComponent } from './components/take-action-card/take-action-card.component';
import { ImpactCalculatorComponent } from './components/impact-calculator/impact-calculator.component';
import { CommunityImpactComponent } from './components/community-impact/community-impact.component';
import { ImpactSummaryComponent } from './components/impact-summary/impact-summary.component';
import { TakeActionDetailComponent } from './components/take-action-detail/take-action-detail.component';
import { ExploreNextComponent } from './components/explore-next/explore-next.component';
import { FirstStepsComponent } from './components/first-steps/first-steps.component';
import { TodayOnWiofComponent } from './components/today-on-wiof/today-on-wiof.component';
import { NextForYouComponent } from './components/next-for-you/next-for-you.component';
import { CookieSettingsLinkComponent } from './components/cookie-settings-link/cookie-settings-link.component';
import { RelatedContentEditorComponent } from './components/related-content-editor/related-content-editor.component';
import { ContinueJourneyBannerComponent } from './components/continue-journey-banner/continue-journey-banner.component';
import { BlogReadTrackerDirective } from './directives/blog-read-tracker.directive';
import { YoutubeWatchTrackerDirective } from './directives/youtube-watch-tracker.directive';
import { YoutubeLiteDirective } from './directives/youtube-lite.directive';
import { EnumLabelPipe } from './pipes/enum-label.pipe';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

const COMPONENTS = [
  HeaderComponent,
  LifeElementsComponent,
  WiofFooterComponent,
  FeedbackDialogComponent,
  BlogCardComponent,
  ElementWelcomeImageComponent,
  EnvCalenderComponent,
  EnvCalendarAgendaComponent,
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
  VideoCardComponent,
  EqWidgetTestComponent,
  EnvCalDialogComponent,
  SectionNavComponent,
  AvatarDropdownComponent,
  BookmarkIconComponent,
  HomeJourneyPanelComponent,
  ElementTakeActionTeaserComponent,
  TakeActionCardComponent,
  ImpactCalculatorComponent,
  CommunityImpactComponent,
  ImpactSummaryComponent,
  TakeActionDetailComponent,
  ExploreNextComponent,
  FirstStepsComponent,
  TodayOnWiofComponent,
  NextForYouComponent,
  CookieSettingsLinkComponent,
  RelatedContentEditorComponent,
  ContinueJourneyBannerComponent,
  SearchBoxComponent,
  BlogReadTrackerDirective,
  YoutubeWatchTrackerDirective,
  YoutubeLiteDirective,
  EnumLabelPipe
];

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule
  ],
  exports: [
    CommonModule,
    IonicModule,
    RouterModule,
    ReactiveFormsModule,
    ...COMPONENTS
  ],
  declarations: [...COMPONENTS],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppCommonModule {}
