import { Component, OnInit } from '@angular/core';
import { EnvDay } from '../../models/env-cal-data';
import { EnvcalService } from '../../services/envcal-service';

@Component({
  selector: 'app-env-calender',
  templateUrl: './env-calender.component.html',
  styleUrls: ['./env-calender.component.scss']
})
export class EnvCalenderComponent implements OnInit {
  todayDate = new Date();
  currentMonth: number = this.todayDate.getMonth();
  currentYear: number = this.todayDate.getFullYear();
  openDialog: boolean = false;
  displayMonth: string;
  displayDay: string;
  occasionForDialog: any;
  selectedOccasionIndex: number = 0;
  days: {
    class: string;
    day: string;
    occasion: any[];
    selectedOccasionIndex: number;
  }[] = [];
  EnvDays: EnvDay[];
  isLoading: boolean = false;
  months = [
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

  constructor(private envDayService: EnvcalService) {}

  ngOnInit() {
    this.loadMonth(this.currentMonth, this.currentYear);
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

  loadMonth(month: number, year: number) {
    this.currentMonth = month;
    this.currentYear = year;
    this.isLoading = true;
    this.envDayService.getEnvCal(this.currentMonth).subscribe(
      (data) => {
        this.EnvDays = data;
        this.todayDate = new Date(this.currentYear, this.currentMonth, 1);
        this.renderCalendar();
        this.isLoading = false;
      },
      () => {
        this.isLoading = false;
      }
    );
  }

  changeMonth(delta: number) {
    const nextDate = new Date(this.currentYear, this.currentMonth + delta, 1);
    this.loadMonth(nextDate.getMonth(), nextDate.getFullYear());
  }

  renderCalendar() {
    this.days = [];
    this.todayDate.setDate(1);
    const lastDay = new Date(
      this.todayDate.getFullYear(),
      this.todayDate.getMonth() + 1,
      0
    ).getDate();
    const firstDayIndex = this.todayDate.getDay();
    this.displayMonth = this.months[this.todayDate.getMonth()];
    this.displayDay = String(this.todayDate.getFullYear());
    for (let x = firstDayIndex; x > 0; x--) {
      this.days.push({
        class: 'day',
        day: '',
        occasion: [],
        selectedOccasionIndex: 0
      });
    }

    for (let i = 1; i <= lastDay; i++) {
      const isToday =
        i === new Date().getDate() &&
        this.todayDate.getMonth() === new Date().getMonth() &&
        this.todayDate.getFullYear() === new Date().getFullYear();

      this.days.push({
        class: isToday ? 'day today' : 'day',
        day: String(i),
        occasion: this.getOccasion(
          String(i),
          String(this.todayDate.getMonth())
        ),
        selectedOccasionIndex: 0
      });
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
