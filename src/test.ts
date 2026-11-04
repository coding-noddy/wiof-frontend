import "zone.js/testing";
import { NgModule, provideZoneChangeDetection } from "@angular/core";
import { getTestBed } from "@angular/core/testing";
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from "@angular/platform-browser-dynamic/testing";

// From Angular 21, TestBed defaults to zoneless change detection. The app
// still uses zone.js (provideZoneChangeDetection in main.ts), so the tests
// do too.
@NgModule({ providers: [provideZoneChangeDetection()] })
class ZoneChangeDetectionTestingModule {}

getTestBed().initTestEnvironment(
  [BrowserDynamicTestingModule, ZoneChangeDetectionTestingModule],
  platformBrowserDynamicTesting()
);
