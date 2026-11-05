import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  EnvironmentInjector,
  NgModule,
  inject,
  provideAppInitializer,
  provideEnvironmentInitializer
} from '@angular/core';
//Firestore Integration Modules
import { AngularFireModule, FirebaseApp } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule, Meta } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { environment } from '../environments/environment';
import { initWiofAppCheck } from './util/app-check';
import { makeAngularFirestoreInjectionSafe } from './util/injection-safe-firestore';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { OnboardingOverlayComponent } from './components/onboarding-overlay/onboarding-overlay.component';
import { JourneyWelcomeComponent } from './components/journey-welcome/journey-welcome.component';
import { LaunchCurtainComponent } from './components/launch-curtain/launch-curtain.component';
import { ConcentPopupComponent } from './components/concent-popup/concent-popup.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AngularFireAnalyticsModule, UserTrackingService } from '@angular/fire/compat/analytics';
import { initWiofAnalytics } from './util/analytics-init';

@NgModule({
  declarations: [AppComponent, OnboardingOverlayComponent, JourneyWelcomeComponent, LaunchCurtainComponent, ConcentPopupComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFirestoreModule,
    AngularFireStorageModule,
    AngularFireAuthModule,
    AngularFireAnalyticsModule,
    BrowserAnimationsModule
  ],
  providers: [
    Meta,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // App Check before any Firebase request; FirebaseApp makes sure the app
    // AngularFire creates exists first.
    provideAppInitializer(() => {
      inject(FirebaseApp);
      initWiofAppCheck();
      // Before AngularFire's analytics: opt-in (nothing sent before consent),
      // no automatic page_view (PageTrackingService sends them).
      initWiofAnalytics();
    }),
    // Page views come from PageTrackingService (started in AppComponent), not
    // AngularFire's ScreenTrackingService.
    UserTrackingService,
    // AngularFire 19+ compat Firestore needs an injection context for
    // collection()/doc(); see makeAngularFirestoreInjectionSafe.
    provideEnvironmentInitializer(() => makeAngularFirestoreInjectionSafe(inject(EnvironmentInjector))),
    // Replaces HttpClientModule (deprecated in Angular 18).
    provideHttpClient(withInterceptorsFromDi())
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {}
