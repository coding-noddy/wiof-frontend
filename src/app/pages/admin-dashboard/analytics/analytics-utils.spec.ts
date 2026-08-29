import { ActivityLogEntry } from '../../../services/activity.service';
import {
  computeUniqueVisitors,
  computeEngagedUsers,
  buildAnalyticsChartData,
  DailyCountPoint
} from './analytics-utils';

function makeEntry(overrides: Partial<ActivityLogEntry>): ActivityLogEntry {
  return {
    userId: 'user1',
    activityType: 'daily_visit',
    timestamp: new Date(),
    calendarDay: '2024-01-15',
    ...overrides
  };
}

describe('analytics-utils', () => {
  describe('computeUniqueVisitors', () => {
    it('should return empty array for no entries', () => {
      expect(computeUniqueVisitors([])).toEqual([]);
    });

    it('should count distinct users per day for daily_visit entries', () => {
      const entries: ActivityLogEntry[] = [
        makeEntry({ userId: 'a', calendarDay: '2024-01-15', activityType: 'daily_visit' }),
        makeEntry({ userId: 'b', calendarDay: '2024-01-15', activityType: 'daily_visit' }),
        makeEntry({ userId: 'a', calendarDay: '2024-01-15', activityType: 'daily_visit' }), // duplicate
        makeEntry({ userId: 'c', calendarDay: '2024-01-16', activityType: 'daily_visit' }),
      ];

      const result = computeUniqueVisitors(entries);
      expect(result).toEqual([
        { calendarDay: '2024-01-15', count: 2 },
        { calendarDay: '2024-01-16', count: 1 }
      ]);
    });

    it('should ignore non-daily_visit entries', () => {
      const entries: ActivityLogEntry[] = [
        makeEntry({ userId: 'a', calendarDay: '2024-01-15', activityType: 'daily_visit' }),
        makeEntry({ userId: 'b', calendarDay: '2024-01-15', activityType: 'blog_read' }),
      ];

      const result = computeUniqueVisitors(entries);
      expect(result).toEqual([{ calendarDay: '2024-01-15', count: 1 }]);
    });

    it('should return results sorted by calendarDay', () => {
      const entries: ActivityLogEntry[] = [
        makeEntry({ userId: 'a', calendarDay: '2024-01-20', activityType: 'daily_visit' }),
        makeEntry({ userId: 'a', calendarDay: '2024-01-10', activityType: 'daily_visit' }),
        makeEntry({ userId: 'a', calendarDay: '2024-01-15', activityType: 'daily_visit' }),
      ];

      const result = computeUniqueVisitors(entries);
      expect(result.map(r => r.calendarDay)).toEqual(['2024-01-10', '2024-01-15', '2024-01-20']);
    });
  });

  describe('computeEngagedUsers', () => {
    it('should return empty array for no entries', () => {
      expect(computeEngagedUsers([])).toEqual([]);
    });

    it('should count distinct users per day for engagement types', () => {
      const entries: ActivityLogEntry[] = [
        makeEntry({ userId: 'a', calendarDay: '2024-01-15', activityType: 'blog_read' }),
        makeEntry({ userId: 'a', calendarDay: '2024-01-15', activityType: 'video_view' }),
        makeEntry({ userId: 'b', calendarDay: '2024-01-15', activityType: 'poll_vote' }),
      ];

      const result = computeEngagedUsers(entries);
      expect(result).toEqual([{ calendarDay: '2024-01-15', count: 2 }]);
    });

    it('should ignore daily_visit entries', () => {
      const entries: ActivityLogEntry[] = [
        makeEntry({ userId: 'a', calendarDay: '2024-01-15', activityType: 'daily_visit' }),
      ];

      expect(computeEngagedUsers(entries)).toEqual([]);
    });

    it('should handle all engagement types', () => {
      const engagementTypes = [
        'blog_read', 'blog_read_complete', 'video_view',
        'video_watch_complete', 'poll_vote', 'eq_completion', 'widget_usage'
      ] as const;

      const entries: ActivityLogEntry[] = engagementTypes.map((activityType, i) =>
        makeEntry({ userId: `user${i}`, calendarDay: '2024-01-15', activityType })
      );

      const result = computeEngagedUsers(entries);
      expect(result).toEqual([{ calendarDay: '2024-01-15', count: 7 }]);
    });
  });

  describe('buildAnalyticsChartData', () => {
    it('should produce labels array of length N', () => {
      const result = buildAnalyticsChartData([], 7);
      expect(result.labels.length).toBe(7);
    });

    it('should produce uniqueVisitors and engagedUsers arrays of length N', () => {
      const result = buildAnalyticsChartData([], 7);
      expect(result.uniqueVisitors.length).toBe(7);
      expect(result.engagedUsers.length).toBe(7);
    });

    it('should zero-fill days with no data', () => {
      const result = buildAnalyticsChartData([], 5);
      expect(result.uniqueVisitors).toEqual([0, 0, 0, 0, 0]);
      expect(result.engagedUsers).toEqual([0, 0, 0, 0, 0]);
    });

    it('should include today as the last label', () => {
      const result = buildAnalyticsChartData([], 3);
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const expectedToday = `${year}-${month}-${day}`;
      expect(result.labels[result.labels.length - 1]).toBe(expectedToday);
    });

    it('should map visitor counts to the correct day positions', () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const entries: ActivityLogEntry[] = [
        makeEntry({ userId: 'a', calendarDay: todayStr, activityType: 'daily_visit' }),
        makeEntry({ userId: 'b', calendarDay: todayStr, activityType: 'daily_visit' }),
      ];

      const result = buildAnalyticsChartData(entries, 3);
      // Last element should have 2 visitors (today)
      expect(result.uniqueVisitors[result.uniqueVisitors.length - 1]).toBe(2);
    });
  });
});
