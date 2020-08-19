import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { IonicModule } from "@ionic/angular";
import { AqiScorecardComponent } from "./components/aqi-scorecard/aqi-scorecard.component";
import { AqiWidgetComponent } from "./components/aqi-widget/aqi-widget.component";
import { BlogCardComponent } from "./components/blog-card/blog-card.component";
import { BlogSliderComponent } from "./components/blog-slider/blog-slider.component";
import { BackButtonComponent } from "./components/back-button/back-button.component";
import { SocialShareComponent } from "./components/social-share/social-share.component";
import { ElementWelcomeImageComponent } from "./components/element-welcome-image/element-welcome-image.component";
import { EnergyWidgetComponent } from "./components/energy-widget/energy-widget.component";
import { EQWidgetComponent } from "./components/eq-widget/eq-widget.component";
import { FoodPhIndicatorMeterComponent } from "./components/food-ph-indicator-meter/food-ph-indicator-meter.component";
import { FoodPhIndicatorComponent } from "./components/food-ph-indicator/food-ph-indicator.component";
import { HeaderComponent } from "./components/header/header.component";
import { LifeElementsComponent } from "./components/life-elements/life-elements.component";
import { PollResultComponent } from "./components/poll-result/poll-result.component";
import { PollsWidgetComponent } from "./components/polls-widget/polls-widget.component";
import { SubscribeComponent } from "./components/subscribe/subscribe.component";
import { VideoSliderComponent } from "./components/video-slider/video-slider.component";
import { VideoWidgetComponent } from "./components/video-widget/video-widget.component";
import { WaterWidgetComponent } from "./components/water-widget/water-widget.component";
import { WiofFooterComponent } from "./components/wiof-footer/wiof-footer.component";
import { WiofSpinnerComponent } from "./components/wiof-spinner/wiof-spinner.component";

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [
    CommonModule,
    IonicModule,
    RouterModule,
    HeaderComponent,
    LifeElementsComponent,
    WiofFooterComponent,
    VideoSliderComponent,
    BlogSliderComponent,
    BlogCardComponent,
    ElementWelcomeImageComponent,
    AqiWidgetComponent,
    ReactiveFormsModule,
    SubscribeComponent,
    WaterWidgetComponent,
    VideoWidgetComponent,
    EQWidgetComponent,
    ReactiveFormsModule,
    SubscribeComponent,
    PollsWidgetComponent,
    FoodPhIndicatorComponent,
    EnergyWidgetComponent,
    AqiScorecardComponent,
    FoodPhIndicatorMeterComponent,
    PollResultComponent,
    WiofSpinnerComponent,
    BackButtonComponent,
    SocialShareComponent
  ],
  declarations: [
    HeaderComponent,
    LifeElementsComponent,
    WiofFooterComponent,
    VideoSliderComponent,
    BlogSliderComponent,
    BlogCardComponent,
    ElementWelcomeImageComponent,
    AqiWidgetComponent,
    SubscribeComponent,
    WaterWidgetComponent,
    VideoWidgetComponent,
    EQWidgetComponent,
    PollsWidgetComponent,
    FoodPhIndicatorComponent,
    EnergyWidgetComponent,
    AqiScorecardComponent,
    FoodPhIndicatorMeterComponent,
    PollResultComponent,
    WiofSpinnerComponent,
    BackButtonComponent,
    SocialShareComponent
  ],
  providers: [],
})
export class AppCommonModule {}
