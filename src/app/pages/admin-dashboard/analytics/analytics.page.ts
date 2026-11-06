import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ChartConfiguration } from 'chart.js';
import { httpsCallable } from 'firebase/functions';
import { first } from 'rxjs/operators';
import { getWiofFunctions } from 'src/app/util/cloud-functions.util';
import { AnalyticsSummary, DailyStats, istToday, ReturnRate, returnRates, summarise } from './analytics-utils';
import { ImpactLine, impactLines, impactMonth } from 'src/app/models/Impact';
import { CommunityImpact, COMMUNITY_IMPACT_COLLECTION } from 'src/app/models/CommunityImpact';

const STATS_COLLECTION = 'analytics_daily';

// Two series, checked for colour-blind separation (dataviz validator):
// the light pair on the warm-white card, the dark pair on the dark admin theme.
const SERIES = {
  light: { active: '#008F96', engaged: '#D38A1F', visitors: '#008F96', grid: 'rgba(43, 36, 32, 0.08)', text: '#6B645F' },
  dark: { active: '#18A3AA', engaged: '#B87A1E', visitors: '#18A3AA', grid: 'rgba(241, 245, 249, 0.08)', text: '#cbd5e1' }
};

/**
 * Admin → Analytics (8.9.0): our own numbers for signed-in members (from
 * the daily summaries, functions/daily-stats.js) and, once connected,
 * Google Analytics traffic for every visitor. Reads one small summary doc
 * per day in the range, not the raw events. Definitions: docs/METRICS.md
 * "Daily analytics"; GA setup: docs/ANALYTICS.md.
 */
@Component({
    selector: 'app-analytics',
    templateUrl: './analytics.page.html',
    styleUrls: ['./analytics.page.scss'],
    standalone: false
})
export class AnalyticsPage implements OnInit {
  readonly ranges = [7, 30, 90];
  range = 30;
  loading = true;
  refreshing = false;
  refreshError: string | null = null;
  lastComputed: Date | null = null;
  summary: AnalyticsSummary | null = null;
  /** "Coming back" (8.15.0), always as of today, whatever the range. */
  comingBack: ReturnRate[] = [];
  /** "Together this month" (8.15.0): shown to admins whatever the member count. */
  community: (CommunityImpact & { lines: ImpactLine[] }) | null = null;
  private stats: DailyStats[] = [];

  membersChart: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  visitorsChart: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration<'line'>['options'] = {};

  constructor(private firestore: AngularFirestore) {}

  ngOnInit(): void {
    this.load();
  }

  setRange(days: number): void {
    this.range = days;
    this.render();
  }

  /** Rebuild today and yesterday now (the schedule does it every 3 hours); with none yet, the last 31 days. */
  async refresh(): Promise<void> {
    this.refreshing = true;
    this.refreshError = null;
    try {
      const rebuild = httpsCallable<{ days: number }, { built: string[] }>(getWiofFunctions(), 'refreshDailyStats');
      await rebuild({ days: this.stats.length ? 2 : 31 });
      this.load();
    } catch (err: any) {
      this.refreshError = err?.message || 'Refresh failed';
    } finally {
      this.refreshing = false;
    }
  }

  /** From how many members "Together this month" shows on Take Action (site_settings/community_impact). */
  minMembersInput: number | null = null;
  savingMinMembers = false;
  minMembersMessage: string | null = null;

  async saveMinMembers(): Promise<void> {
    const n = Math.round(Number(this.minMembersInput));
    if (!Number.isInteger(n) || n < 1 || n > 1000) {
      this.minMembersMessage = 'Enter a whole number from 1 to 1000.';
      return;
    }
    this.savingMinMembers = true;
    this.minMembersMessage = null;
    try {
      await this.firestore.doc('site_settings/community_impact').set({ minMembers: n });
      // Rebuild today's summary, which also rebuilds this month's community numbers with the new minimum.
      await httpsCallable(getWiofFunctions(), 'refreshDailyStats')({ days: 1 });
      this.minMembersMessage = `Saved: Take Action shows it from ${n} member${n === 1 ? '' : 's'}.`;
      this.load();
    } catch (err: any) {
      this.minMembersMessage = err?.message || 'Could not save.';
    } finally {
      this.savingMinMembers = false;
    }
  }

  private loadCommunity(): void {
    this.firestore
      .doc<CommunityImpact>(`${COMMUNITY_IMPACT_COLLECTION}/${impactMonth()}`)
      .get()
      .pipe(first())
      .subscribe({
        next: (snap) => {
          const c = snap.data();
          this.community = c ? { ...c, lines: impactLines(c.totals) } : null;
          if (c && this.minMembersInput === null) this.minMembersInput = c.minMembers;
        },
        error: () => (this.community = null)
      });
  }

  private load(): void {
    this.loading = true;
    this.loadCommunity();
    this.firestore
      .collection<DailyStats>(STATS_COLLECTION, (ref) => ref.orderBy('day', 'desc').limit(Math.max(...this.ranges)))
      .get()
      .pipe(first())
      .subscribe({
        next: (snap) => {
          this.stats = snap.docs.map((d) => d.data());
          const computed = this.stats.map((s) => s.computedAt?.toDate?.()).filter(Boolean) as Date[];
          this.lastComputed = computed.length ? new Date(Math.max(...computed.map((d) => d.getTime()))) : null;
          this.render();
          this.loading = false;
        },
        error: () => {
          this.stats = [];
          this.render();
          this.loading = false;
        }
      });
  }

  private render(): void {
    const s = summarise(this.stats, istToday(), this.range);
    this.summary = s;
    this.comingBack = returnRates(this.stats, istToday());
    const c = document.body.classList.contains('admin-dark-theme') ? SERIES.dark : SERIES.light;
    const labels = s.labels.map((d) => d.slice(5));
    const line = (label: string, data: (number | null)[], color: string) => ({
      label, data, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 4, pointHoverRadius: 6,
      pointBorderColor: '#ffffff', pointBorderWidth: 2, tension: 0, spanGaps: false
    });
    this.membersChart = {
      labels,
      datasets: [line('Active members', s.series.active, c.active), line('Engaged members', s.series.engaged, c.engaged)]
    };
    this.visitorsChart = { labels, datasets: [line('Visitors (Google Analytics)', s.series.visitors, c.visitors)] };
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      // No entry animation: a dashboard should show its numbers at once.
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'top', align: 'start', labels: { color: c.text, usePointStyle: true, boxWidth: 8 } },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: c.text, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
        y: { beginAtZero: true, grid: { color: c.grid }, ticks: { color: c.text, precision: 0 } }
      }
    };
  }

  /** Bar width for a share, at least a sliver when there's anything. */
  barWidth(part: number, whole: number): number {
    return whole > 0 ? Math.max(2, Math.round((part / whole) * 100)) : 0;
  }

  maxOf(values: number[]): number {
    return Math.max(0, ...values);
  }
}
