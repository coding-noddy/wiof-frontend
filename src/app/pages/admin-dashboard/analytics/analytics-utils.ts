import { ActivityLogEntry, toCalendarDay } from '../../../services/activity.service';

/** Aggregated data point for a single calendar day */
export interface DailyCountPoint {
  calendarDay: string;  // "YYYY-MM-DD"
  count: number;
}

/** Computed chart datasets for the analytics page */
export interface AnalyticsChartData {
  labels: string[];                // x-axis: calendar day strings
  uniqueVisitors: number[];        // y-axis values: unique visitor counts per day
  engagedUsers: number[];          // y-axis values: engaged user counts per day
}

/**
 * Computes daily unique visitor counts from activity log entries.
 * Groups entries by calendarDay, counts distinct userIds with activityType='daily_visit'.
 */
export function computeUniqueVisitors(entries: ActivityLogEntry[]): DailyCountPoint[] {
  const dayMap = new Map<string, Set<string>>();

  for (const entry of entries) {
    if (entry.activityType !== 'daily_visit') continue;
    if (!dayMap.has(entry.calendarDay)) {
      dayMap.set(entry.calendarDay, new Set());
    }
    dayMap.get(entry.calendarDay)!.add(entry.userId);
  }

  return Array.from(dayMap.entries())
    .map(([calendarDay, users]) => ({ calendarDay, count: users.size }))
    .sort((a, b) => a.calendarDay.localeCompare(b.calendarDay));
}

const ENGAGEMENT_TYPES: ActivityLogEntry['activityType'][] = [
  'blog_read', 'blog_read_complete', 'video_view',
  'video_watch_complete', 'poll_vote', 'eq_completion', 'widget_usage'
];

/**
 * Computes daily engaged user counts from activity log entries.
 * Groups entries by calendarDay, counts distinct userIds with engagement activity types.
 */
export function computeEngagedUsers(entries: ActivityLogEntry[]): DailyCountPoint[] {
  const dayMap = new Map<string, Set<string>>();

  for (const entry of entries) {
    if (!ENGAGEMENT_TYPES.includes(entry.activityType)) continue;
    if (!dayMap.has(entry.calendarDay)) {
      dayMap.set(entry.calendarDay, new Set());
    }
    dayMap.get(entry.calendarDay)!.add(entry.userId);
  }

  return Array.from(dayMap.entries())
    .map(([calendarDay, users]) => ({ calendarDay, count: users.size }))
    .sort((a, b) => a.calendarDay.localeCompare(b.calendarDay));
}

/**
 * Builds the full chart dataset for a given date range (last N days).
 * Fills in zero-count days where no activity exists.
 */
export function buildAnalyticsChartData(
  entries: ActivityLogEntry[],
  days: number = 30
): AnalyticsChartData {
  const today = new Date();
  const labels: string[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    labels.push(toCalendarDay(d));
  }

  const visitors = computeUniqueVisitors(entries);
  const engaged = computeEngagedUsers(entries);

  const visitorMap = new Map(visitors.map(v => [v.calendarDay, v.count]));
  const engagedMap = new Map(engaged.map(e => [e.calendarDay, e.count]));

  return {
    labels,
    uniqueVisitors: labels.map(day => visitorMap.get(day) || 0),
    engagedUsers: labels.map(day => engagedMap.get(day) || 0)
  };
}
