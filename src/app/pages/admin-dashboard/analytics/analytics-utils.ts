/**
 * Admin → Analytics (8.9.0): turns the daily summaries
 * (analytics_daily/{day}, functions/daily-stats.js) into what the page
 * shows for a range of days. Pure functions, unit-tested.
 */

export type SuggestionVia = 'explore_next' | 'story_behind' | 'today' | 'next_for_you';

export interface DailyStats {
  day: string;
  users: { active: number; engaged: number; new: number };
  totals: {
    storiesOpened: number; qualityReads: number; videosOpened: number; videosCompleted: number;
    actionsCompleted: number; eqChecks: number; pollVotes: number; widgetUses: number; suggestionClicks: number;
  };
  byElement: Record<string, { qualityReads: number; actionsCompleted: number }>;
  suggestions: Record<SuggestionVia, { clicks: number; converted: number; users: number }>;
  topStories: { id: string; title: string; element: string | null; reads: number }[];
  topActions: { id: string; title: string; completions: number }[];
  firstSteps: { members: number; choseElements: number; readStory: number; watchedVideo: number; checkedEq: number; didAction: number; allFive: number };
  /** Members active that day (8.15.0), for "Coming back". Missing on older summaries until rebuilt. */
  activeMemberIds?: string[];
  traffic: null | { error?: string; users?: number; newUsers?: number; sessions?: number; pageViews?: number;
    topPages?: { path: string; title: string; views: number; users: number }[]; groups?: { group: string; views: number }[] };
  computedAt?: any;
}

export const SUGGESTION_LABELS: Record<SuggestionVia, string> = {
  explore_next: 'Explore next (stories and videos)',
  story_behind: 'The story behind an action',
  today: 'Today on WIOF',
  next_for_you: 'Next for you'
};

export const ELEMENT_LABELS: Record<string, string> = { air: 'Air', water: 'Water', earth: 'Earth', energy: 'Energy', spirit: 'Spirit' };

/** The last `count` days up to `last`, oldest first: "2026-11-05". */
export function dayLabels(last: string, count: number): string[] {
  const end = new Date(`${last}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - (count - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

/** Today in India time, as the summaries are dated. */
export function istToday(now = new Date()): string {
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const sum = (values: number[]) => values.reduce((a, b) => a + (b || 0), 0);
/** A share as a whole percent, or null when there's nothing to divide by. */
export const percent = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 100) : null);

/** Adds up [key, amount] pairs by key, most first, top n. */
function topBy<T>(items: T[], key: (t: T) => string, amount: (t: T) => number, n: number): { key: string; total: number; item: T }[] {
  const totals = new Map<string, { key: string; total: number; item: T }>();
  items.forEach((t) => {
    const k = key(t);
    const entry = totals.get(k) || { key: k, total: 0, item: t };
    entry.total += amount(t);
    totals.set(k, entry);
  });
  return [...totals.values()].sort((a, b) => b.total - a.total || a.key.localeCompare(b.key)).slice(0, n);
}

export interface AnalyticsSummary {
  labels: string[];
  /** Per day, null where no summary exists yet. */
  series: { active: (number | null)[]; engaged: (number | null)[]; visitors: (number | null)[] };
  daysWithData: number;
  totals: {
    newMembers: number; qualityReads: number; videosCompleted: number; actionsCompleted: number; eqChecks: number;
    pollVotes: number; avgActive: number | null; visitors: number | null; pageViews: number | null;
  };
  suggestions: { via: SuggestionVia; label: string; clicks: number; converted: number; rate: number | null }[];
  elements: { element: string; label: string; qualityReads: number; actionsCompleted: number }[];
  firstSteps: { label: string; count: number; rate: number | null }[] | null;
  firstStepsMembers: number;
  topPages: { path: string; title: string; views: number }[];
  pageGroups: { group: string; views: number }[];
  topStories: { title: string; element: string | null; reads: number }[];
  topActions: { title: string; completions: number }[];
  /** Whether any day in the range has Google Analytics numbers; 'error' if GA was set up but failed. */
  ga: 'connected' | 'error' | 'off';
}

export function summarise(stats: DailyStats[], last: string, count: number): AnalyticsSummary {
  const labels = dayLabels(last, count);
  const byDay = new Map(stats.map((s) => [s.day, s]));
  const days = labels.map((d) => byDay.get(d)).filter((s): s is DailyStats => !!s);
  const withTraffic = days.filter((s) => s.traffic && !s.traffic.error);
  const total = (pick: (s: DailyStats) => number) => sum(days.map(pick));

  const suggestions = (Object.keys(SUGGESTION_LABELS) as SuggestionVia[]).map((via) => {
    const clicks = total((s) => s.suggestions?.[via]?.clicks || 0);
    const converted = total((s) => s.suggestions?.[via]?.converted || 0);
    return { via, label: SUGGESTION_LABELS[via], clicks, converted, rate: percent(converted, clicks) };
  });

  const elements = Object.keys(ELEMENT_LABELS).map((element) => ({
    element,
    label: ELEMENT_LABELS[element],
    qualityReads: total((s) => s.byElement?.[element]?.qualityReads || 0),
    actionsCompleted: total((s) => s.byElement?.[element]?.actionsCompleted || 0)
  }));

  // First steps is a running snapshot: the latest day in the range says where everyone is now.
  const latest = days[days.length - 1];
  const fs = latest?.firstSteps;
  const firstSteps = fs ? [
    { label: 'Chose their elements', count: fs.choseElements },
    { label: 'Read a story to the end', count: fs.readStory },
    { label: 'Watched a video', count: fs.watchedVideo },
    { label: 'Checked their EQ', count: fs.checkedEq },
    { label: 'Did an action', count: fs.didAction },
    { label: 'All five first steps', count: fs.allFive }
  ].map((r) => ({ ...r, rate: percent(r.count, fs.members) })) : null;

  return {
    labels,
    series: {
      active: labels.map((d) => byDay.get(d)?.users.active ?? null),
      engaged: labels.map((d) => byDay.get(d)?.users.engaged ?? null),
      visitors: labels.map((d) => {
        const t = byDay.get(d)?.traffic;
        return t && !t.error ? t.users ?? null : null;
      })
    },
    daysWithData: days.length,
    totals: {
      newMembers: total((s) => s.users.new),
      qualityReads: total((s) => s.totals.qualityReads),
      videosCompleted: total((s) => s.totals.videosCompleted),
      actionsCompleted: total((s) => s.totals.actionsCompleted),
      eqChecks: total((s) => s.totals.eqChecks),
      pollVotes: total((s) => s.totals.pollVotes),
      avgActive: days.length ? Math.round((total((s) => s.users.active) / days.length) * 10) / 10 : null,
      visitors: withTraffic.length ? sum(withTraffic.map((s) => s.traffic!.users || 0)) : null,
      pageViews: withTraffic.length ? sum(withTraffic.map((s) => s.traffic!.pageViews || 0)) : null
    },
    suggestions,
    elements,
    firstSteps,
    firstStepsMembers: fs?.members || 0,
    topPages: topBy(withTraffic.flatMap((s) => s.traffic!.topPages || []), (p) => p.path, (p) => p.views, 10)
      .map(({ key, total: views, item }) => ({ path: key, title: item.title, views })),
    pageGroups: topBy(withTraffic.flatMap((s) => s.traffic!.groups || []), (g) => g.group, (g) => g.views, 12)
      .map(({ key, total: views }) => ({ group: key, views })),
    topStories: topBy(days.flatMap((s) => s.topStories || []), (t) => t.id, (t) => t.reads, 10)
      .map(({ total: reads, item }) => ({ title: item.title, element: item.element, reads })),
    topActions: topBy(days.flatMap((s) => s.topActions || []), (t) => t.id, (t) => t.completions, 10)
      .map(({ total: completions, item }) => ({ title: item.title, completions })),
    ga: withTraffic.length ? 'connected' : days.some((s) => s.traffic?.error) ? 'error' : 'off'
  };
}

export interface ReturnRate {
  label: string;
  /** Members active in the earlier window. */
  base: number;
  /** Of those, how many were active again in the later window. */
  returned: number;
  rate: number | null;
  /** False when a day in either window has no member list yet (summaries from before 8.15.0). */
  complete: boolean;
}

/**
 * "Coming back" (8.15.0): of the members active in one window, how many
 * were active again in the window after it, ending on `last`.
 * Week: active 8–14 days ago, back in the last 7 days.
 * Month: active 31–60 days ago, back in the last 30 days.
 */
export function returnRates(stats: DailyStats[], last: string): ReturnRate[] {
  const byDay = new Map(stats.map((s) => [s.day, s]));
  const windows: [string, number][] = [['Came back within a week', 7], ['Came back within a month', 30]];
  return windows.map(([label, size]) => {
    const days = dayLabels(last, size * 2);
    let complete = true;
    const members = (window: string[]) => {
      const ids = new Set<string>();
      for (const d of window) {
        const list = byDay.get(d)?.activeMemberIds;
        if (!list) {
          complete = false;
          continue;
        }
        list.forEach((id) => ids.add(id));
      }
      return ids;
    };
    const base = members(days.slice(0, size));
    const recent = members(days.slice(size));
    const returned = [...base].filter((id) => recent.has(id)).length;
    return { label, base: base.size, returned, rate: percent(returned, base.size), complete };
  });
}
