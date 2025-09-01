import { Component, OnInit } from '@angular/core';
import { EnvDay } from '../../models/env-cal-data';
import { EnvcalService } from '../../services/envcal-service';
import { Observable } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-env-calender',
  templateUrl: './env-calender.component.html',
  styleUrls: ['./env-calender.component.scss'],
  standalone: false
})
export class EnvCalenderComponent implements OnInit {
  todayDate = new Date();
  imageUrl: Observable<any>;
  openDialog: boolean = false;
  safeUrl: string;
  displayMonth: string;
  displayDay: string;
  link: SafeResourceUrl;
  occasionForDialog: any;
  selectedOccasionIndex: number = 0;
  days: {
    class: string;
    day: string;
    occasion: any[];
    selectedOccasionIndex: number;
  }[] = [];
  EnvDays: EnvDay[];

  constructor(
    private envDayService: EnvcalService,
    private santz: DomSanitizer
  ) {}

  ngOnInit() {
    this.envDayService
      .getEnvCal(this.todayDate.getMonth())
      .subscribe((data) => {
        this.EnvDays = data;
        this.renderCalendar();
      });
    this.link = this.santz.bypassSecurityTrustResourceUrl(this.safeUrl);

    this.safeUrl =
      'https://firebasestorage.googleapis.com/v0/b/wiof-staging.appspot.com/o/environment-calendar%2F1603616920627_IMG-20180901-WA0021.jpg?alt=media&token=d81cae0f-9581-4f37-8d9a-425a001ea94b';
  }

  getOccasion(day, month) {
    const occasion = new Array();
    this.EnvDays.forEach((x) => {
      if (x.day == day && x.month == month) {
        occasion.push({
          day: x.day,
          month: x.month,
          name: x.occasion,
          image: x.image,
          desc: x.description,
          link: x.showMoreLink
        });
      }
    });
    return occasion;
  }

  renderCalendar() {
    this.todayDate.setDate(1);
    const lastDay = new Date(
      this.todayDate.getFullYear(),
      this.todayDate.getMonth() + 1,
      0
    ).getDate();
    const prevLastDay = new Date(
      this.todayDate.getFullYear(),
      this.todayDate.getMonth(),
      0
    ).getDate();
    const firstDayIndex = this.todayDate.getDay();
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    this.displayMonth = months[this.todayDate.getMonth()];
    this.displayDay = new Date().toDateString();
    for (let x = firstDayIndex; x > 0; x--) {
      this.days.push({
        class: 'day',
        day: '',
        occasion: [],
        selectedOccasionIndex: 0
      });
    }

    for (let i = 1; i <= lastDay; i++) {
      if (
        i === new Date().getDate() &&
        this.todayDate.getMonth() === new Date().getMonth()
      ) {
        this.days.push({
          class: 'day today',
          day: String(i),
          occasion: this.getOccasion(
            String(i),
            String(this.todayDate.getMonth())
          ),
          selectedOccasionIndex: 0
        });
      } else {
        this.days.push({
          class: 'day',
          day: String(i),
          occasion: this.getOccasion(
            String(i),
            String(this.todayDate.getMonth())
          ),
          selectedOccasionIndex: 0
        });
      }
    }
  }
  closeDialog() {
    this.openDialog = false;
    this.occasionForDialog = null;
  }

  openOccasionDialog(occasion) {
    this.openDialog = true;
    this.occasionForDialog = occasion;
    console.log(this.occasionForDialog);
  }

  nextOccasion(day) {
    day.selectedOccasionIndex++;
  }

  prevOccasion(day) {
    day.selectedOccasionIndex--;
  }
}
