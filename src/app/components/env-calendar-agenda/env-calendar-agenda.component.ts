import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { EnvcalService } from 'src/app/services/envcal-service';
import { EnvDay } from 'src/app/models/env-cal-data';
import { EnvCalDialogComponent } from '../env-cal-dialog/env-cal-dialog.component';

interface AgendaDay {
  label: string;
  date: string;
  occasions: EnvDay[];
}

@Component({
  selector: 'app-env-calendar-agenda',
  templateUrl: './env-calendar-agenda.component.html',
  styleUrls: ['./env-calendar-agenda.component.scss']
})
export class EnvCalendarAgendaComponent implements OnInit {
  today: EnvDay[] = [];
  todayLabel: string;
  upcomingDays: AgendaDay[] = [];
  isLoading = true;

  private static readonly WEEKDAY_MONTH_DAY: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  };

  constructor(
    private envcalService: EnvcalService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit(): void {
    const now = new Date();
    this.todayLabel = now.toLocaleDateString('en-US', EnvCalendarAgendaComponent.WEEKDAY_MONTH_DAY);

    // Next 7 days: today plus the 6 days after it.
    this.envcalService.getUpcomingOccasions(now, 7).subscribe((result) => {
      this.today = result.today;

      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);

      this.upcomingDays = result.upcoming
        .filter((entry) => entry.days.length > 0)
        .map((entry) => ({
          label: this.isSameDate(entry.date, tomorrow)
            ? 'Tomorrow'
            : entry.date.toLocaleDateString('en-US', { weekday: 'long' }),
          date: entry.date.toLocaleDateString('en-US', EnvCalendarAgendaComponent.WEEKDAY_MONTH_DAY),
          occasions: entry.days
        }));

      this.isLoading = false;
    });
  }

  private isSameDate(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  // Opens the same event-detail modal the full calendar grid uses. All
  // occasions sharing that date are passed together so the modal's own
  // prev/next navigation between same-day events still works.
  async openOccasion(occasions: EnvDay[]): Promise<void> {
    const occasion = occasions.map((day) => ({
      day: day.day,
      month: day.month,
      name: day.occasion,
      image: day.image,
      desc: day.description,
      link: day.showMoreLink
    }));

    const modal = await this.modalCtrl.create({
      component: EnvCalDialogComponent,
      componentProps: { occasionDetails: { occasion } },
      cssClass: 'env-cal-modal',
      backdropDismiss: true
    });
    await modal.present();
  }
}
