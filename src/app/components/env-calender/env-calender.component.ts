import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { ModalController } from '@ionic/angular';
import { EnvDay } from '../../models/env-cal-data';
import { EnvcalService } from '../../services/envcal-service';
import { EnvCalDialogComponent } from '../env-cal-dialog/env-cal-dialog.component';
import { buildModalZoomAnimation } from '../../util/modal-zoom-animation';

@Component({
  selector: 'app-env-calender',
  templateUrl: './env-calender.component.html',
  styleUrls: ['./env-calender.component.scss'],
  animations: [
    // Re-runs on every monthKey change (prev/next both produce a new number),
    // sliding the already-updated grid in from the direction the user
    // navigated toward — a "changing slide" feel instead of a flat snap.
    trigger('monthSlide', [
      transition('* => *', [
        style({ transform: 'translateX({{ enterX }}%)', opacity: 0 }),
        animate(
          '280ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ transform: 'translateX(0%)', opacity: 1 })
        )
      ], { params: { enterX: 28 } })
    ])
  ]
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
  slideDirection: 'next' | 'prev' = 'next';
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

  constructor(private envDayService: EnvcalService, private modalCtrl: ModalController) {}

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
    this.slideDirection = delta >= 0 ? 'next' : 'prev';
    const nextDate = new Date(this.currentYear, this.currentMonth + delta, 1);
    this.loadMonth(nextDate.getMonth(), nextDate.getFullYear());
  }

  get monthKey(): number {
    return this.currentYear * 12 + this.currentMonth;
  }

  get monthSlideState() {
    return {
      value: this.monthKey,
      params: { enterX: this.slideDirection === 'next' ? 28 : -28 }
    };
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

  async openOccasionDialog(occasion, event?: MouseEvent) {
    // Capture the clicked day cell's position so the modal can zoom out from
    // it on open and shrink back into it on close, instead of a generic fade.
    const originEl = event?.currentTarget as HTMLElement;
    const originRect = originEl?.getBoundingClientRect();

    const modal = await this.modalCtrl.create({
      component: EnvCalDialogComponent,
      componentProps: { occasionDetails: occasion },
      cssClass: 'env-cal-modal',
      backdropDismiss: true,
      enterAnimation: (baseEl) => buildModalZoomAnimation(baseEl, originRect, false),
      leaveAnimation: (baseEl) => buildModalZoomAnimation(baseEl, originRect, true)
    });
    await modal.present();
  }

  nextOccasion(day) {
    day.selectedOccasionIndex++;
  }

  prevOccasion(day) {
    day.selectedOccasionIndex--;
  }
}
