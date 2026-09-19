import { Component, OnInit } from '@angular/core';
import { ModalController, createAnimation, Animation } from '@ionic/angular';
import { EnvDay } from '../../models/env-cal-data';
import { EnvcalService } from '../../services/envcal-service';
import { EnvCalDialogComponent } from '../env-cal-dialog/env-cal-dialog.component';

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
      enterAnimation: (baseEl) => this.buildZoomAnimation(baseEl, originRect, false),
      leaveAnimation: (baseEl) => this.buildZoomAnimation(baseEl, originRect, true)
    });
    await modal.present();
  }

  private buildZoomAnimation(
    baseEl: HTMLElement,
    originRect: DOMRect | undefined,
    reverse: boolean
  ): Animation {
    // Ionic 7 modals render inside a shadow root — fall back to baseEl itself
    // if there isn't one (e.g. shady-DOM polyfill environments).
    const root = (baseEl.shadowRoot ?? baseEl) as ParentNode;
    const wrapperEl = root.querySelector('.modal-wrapper') as HTMLElement;
    const backdropEl = root.querySelector('ion-backdrop') as HTMLElement;

    const backdropAnimation = createAnimation().addElement(backdropEl).fromTo('opacity', '0.01', 'var(--backdrop-opacity)');
    const wrapperAnimation = createAnimation().addElement(wrapperEl);

    if (originRect && wrapperEl) {
      const targetRect = wrapperEl.getBoundingClientRect();
      const translateX = originRect.left + originRect.width / 2 - (targetRect.left + targetRect.width / 2);
      const translateY = originRect.top + originRect.height / 2 - (targetRect.top + targetRect.height / 2);
      const scale = Math.max(Math.min(originRect.width / targetRect.width, 1), 0.05);

      wrapperAnimation.keyframes([
        { offset: 0, opacity: '0', transform: `translate(${translateX}px, ${translateY}px) scale(${scale})` },
        { offset: 1, opacity: '1', transform: 'translate(0, 0) scale(1)' }
      ]);
    } else {
      // No origin captured (e.g. keyboard-triggered open) — plain scale-in.
      wrapperAnimation.keyframes([
        { offset: 0, opacity: '0', transform: 'scale(0.8)' },
        { offset: 1, opacity: '1', transform: 'scale(1)' }
      ]);
    }

    const baseAnimation = createAnimation()
      .addElement(baseEl)
      .easing('cubic-bezier(0.32, 0.72, 0, 1)')
      .duration(380)
      .addAnimation([backdropAnimation, wrapperAnimation]);

    return reverse ? baseAnimation.direction('reverse') : baseAnimation;
  }

  nextOccasion(day) {
    day.selectedOccasionIndex++;
  }

  prevOccasion(day) {
    day.selectedOccasionIndex--;
  }
}
