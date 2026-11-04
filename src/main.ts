import { enableProdMode, provideZoneChangeDetection } from "@angular/core";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";

import { AppModule } from "./app/app.module";
import { environment } from "./environments/environment";

// Register Swiper custom elements (replaces ion-slides in Ionic 7+)
import { register } from 'swiper/element/bundle';
register();

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule, { applicationProviders: [provideZoneChangeDetection()] })
  .catch((err) => console.log(err));
