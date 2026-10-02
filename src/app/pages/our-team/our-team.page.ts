import { Component, OnInit } from '@angular/core';
import { AboutUsService, AboutUsProfile } from '../../services/aboutus.service';
import { Observable, of } from 'rxjs';
import { aboutUsData } from './our-team-mock';

@Component({
  selector: 'app-our-team',
  templateUrl: './our-team.page.html',
  styleUrls: ['./our-team.page.scss'],
})
export class OurTeamPage implements OnInit {
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
