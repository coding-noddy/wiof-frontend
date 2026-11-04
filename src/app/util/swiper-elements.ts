// Registers Swiper's custom elements (<swiper-container>, <swiper-slide>).
// Imported by SlidersModule, and loaded on demand before a popup with a
// slider opens, so pages without sliders don't download Swiper (~47 KB gzip).
import { register } from 'swiper/element/bundle';

register();
