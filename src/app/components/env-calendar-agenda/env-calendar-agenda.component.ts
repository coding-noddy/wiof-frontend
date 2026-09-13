import { Component, OnInit } from '@angular/core';
import { EnvcalService } from 'src/app/services/envcal-service';
import { EnvDay } from 'src/app/models/env-cal-data';

@Component({
  selector: 'app-env-calendar-agenda',
  templateUrl: './env-calendar-agenda.component.html',
  styleUrls: ['./env-calendar-agenda.component.scss']
})
export class EnvCalendarAgendaComponent implements OnInit {
  today: EnvDay[] = [];
  tomorrow: EnvDay[] = [];
  todayLabel: string;
  tomorrowLabel: string;
  isLoading = true;

  private static readonly WEEKDAY_MONTH_DAY: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  };

  constructor(private envcalService: EnvcalService) {}

  ngOnInit(): void {
    const now = new Date();
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);

    this.todayLabel = now.toLocaleDateString('en-US', EnvCalendarAgendaComponent.WEEKDAY_MONTH_DAY);
    this.tomorrowLabel = tomorrowDate.toLocaleDateString('en-US', EnvCalendarAgendaComponent.WEEKDAY_MONTH_DAY);

    this.envcalService.getUpcomingOccasions(now).subscribe((result) => {
      this.today = result.today;
      this.tomorrow = result.tomorrow;
      this.isLoading = false;
    });
  }
}
