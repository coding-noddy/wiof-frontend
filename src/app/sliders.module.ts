import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { AppCommonModule } from './app-common.module';
import { BlogSliderComponent } from './components/blog-slider/blog-slider.component';
import { BreakingNewsComponent } from './components/breaking-news/breaking-news.component';
import { CoffeeConversationComponent } from './components/coffee-conversation/coffee-conversation.component';
import { InFocusWidgetComponent } from './components/in-focus-widget/in-focus-widget.component';
import { VideoSliderComponent } from './components/video-slider/video-slider.component';
// Defines <swiper-container> before any of these components render.
import './util/swiper-elements';

const SLIDERS = [
  BlogSliderComponent,
  BreakingNewsComponent,
  CoffeeConversationComponent,
  InFocusWidgetComponent,
  VideoSliderComponent
];

/**
 * The components built on Swiper. Only the pages that show them (home and
 * the element pages) import this module, so Swiper is bundled with those
 * pages instead of being loaded on every page from main.ts.
 */
@NgModule({
  imports: [AppCommonModule],
  declarations: [...SLIDERS],
  exports: [...SLIDERS],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SlidersModule {}
