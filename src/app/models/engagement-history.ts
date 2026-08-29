/**
 * Engagement history models for the My Journey page.
 * These interfaces represent processed activity data displayed to users.
 */

/**
 * Represents a quality blog read — a blog the user has fully engaged with
 * (met scroll depth and time spent thresholds).
 */
export interface QualityReadEntry {
  contentId: string;
  blogTitle: string;
  completedDate: Date;
  scrollDepth: number;    // 0-100 percentage
  timeSpent: number;      // seconds
}

/**
 * Represents a single EQ assessment completion with dimension breakdown.
 */
export interface EqHistoryEntry {
  date: Date;
  overallScore: number;
  attentionScore: number;
  clarityScore: number;
  reparationScore: number;
}

/**
 * Represents a single poll vote by the user.
 */
export interface PollHistoryEntry {
  contentId: string;
  pollTitle: string;
  selectedOption: string;
  voteDate: Date;
}

/**
 * Represents a completed video watch entry displayed in the Videos Watched section.
 */
export interface VideoWatchHistoryEntry {
  contentId: string;
  videoTitle: string;
  watchPercent: number;   // 0-100 integer percentage
  completedDate: Date;
}
