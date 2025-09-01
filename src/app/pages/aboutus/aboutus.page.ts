import { Component, OnInit } from '@angular/core';
import { AboutUsService, AboutUsProfile } from '../../services/aboutus.service';
import { Observable, of } from 'rxjs';
import { switchMap, defaultIfEmpty, take } from 'rxjs/operators';
import { aboutUsData } from './aboutus-mock';

@Component({
  selector: 'app-aboutus',
  templateUrl: './aboutus.page.html',
  styleUrls: ['./aboutus.page.scss'],
})
export class AboutusPage implements OnInit {
  aboutUsProfiles$: Observable<AboutUsProfile[]>;

  constructor(private aboutUsService: AboutUsService) {}

  ngOnInit() {
    // Fetch profiles from Firebase and fall back to mock data if empty
    this.aboutUsProfiles$ = this.aboutUsService.getAboutUsProfiles().pipe(
      take(1),
      switchMap((profiles) =>
        profiles.length ? of(profiles) : of(aboutUsData)
      ),
      defaultIfEmpty(aboutUsData)
    );
  }
}
