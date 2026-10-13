import { HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
//Firestore Integration Modules
import { AngularFireModule, FirebaseApp } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule, Meta } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { environment } from '../environments/environment';
import { initWiofAppCheck } from './util/app-check';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { OnboardingOverlayComponent } from './components/onboarding-overlay/onboarding-overlay.component';
import { LaunchCurtainComponent } from './components/launch-curtain/launch-curtain.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  AngularFireAnalyticsModule,
  ScreenTrackingService,
  UserTrackingService
} from '@angular/fire/compat/analytics';

@NgModule({
  declarations: [AppComponent, OnboardingOverlayComponent, LaunchCurtainComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    HttpClientModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFirestoreModule,
    AngularFireStorageModule,
    AngularFireAuthModule,
    AngularFireAnalyticsModule,
    BrowserAnimationsModule
  ],
  providers: [
    StatusBar,
    SplashScreen,
    Meta,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // App Check before any Firebase request; FirebaseApp makes sure the app
    // AngularFire creates exists first.
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [FirebaseApp],
      useFactory: () => () => initWiofAppCheck()
    },
    ScreenTrackingService,
    UserTrackingService
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {}
