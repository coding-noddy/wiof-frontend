import { Component, OnInit } from '@angular/core';
import { AboutUsService, AboutUsProfile } from '../../services/aboutus.service';
import { Observable, of } from 'rxjs';
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
    // Fetch profiles from Firebase
    this.aboutUsProfiles$ = this.aboutUsService.getAboutUsProfiles();

    this.aboutUsProfiles$.subscribe(data => {
      if(data.length == 0) {
        this.aboutUsProfiles$ = of(aboutUsData);
      }
    });
  }
}
