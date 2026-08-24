import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ChartConfiguration, ChartType } from 'chart.js';
import { Observable } from 'rxjs';

import { ActivityLogEntry, toCalendarDay } from '../../../services/activity.service';
import { FIREBASE_COLLECTION } from '../../../app.constants';
import { buildAnalyticsChartData, AnalyticsChartData } from './analytics-utils';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss']
})
export class AnalyticsPage implements OnInit {

  lineChartType: ChartType = 'line';

  lineChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: []
  };

  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Calendar Day'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Visitor Count'
        },
        beginAtZero: true
      }
    }
  };

  constructor(private firestore: AngularFirestore) {}

  ngOnInit(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDay = toCalendarDay(thirtyDaysAgo);

    this.getRecentActivityLogs(fromDay).subscribe(entries => {
      const chartData: AnalyticsChartData = buildAnalyticsChartData(entries);
      this.lineChartData = {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Unique Visitors',
            data: chartData.uniqueVisitors,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: false,
            tension: 0.3
          },
          {
            label: 'Engaged Users',
            data: chartData.engagedUsers,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: false,
            tension: 0.3
          }
        ]
      };
    });
  }

  /**
   * Queries activity_log entries where calendarDay >= fromDay, ordered ascending.
   */
  getRecentActivityLogs(fromDay: string): Observable<ActivityLogEntry[]> {
    return this.firestore
      .collection<ActivityLogEntry>(FIREBASE_COLLECTION.ACTIVITY_LOG, ref =>
        ref.where('calendarDay', '>=', fromDay).orderBy('calendarDay', 'asc')
      )
      .valueChanges();
  }
}
