/**
 * "Together this month" (8.15.0): what WIOF members saved together, one
 * public summary per India-time month (functions/community-impact.js).
 * Totals only. The site shows the numbers once `members >= minMembers`.
 */
export const COMMUNITY_IMPACT_COLLECTION = 'community_impact';

export interface CommunityImpact {
  month: string;
  totals: { [measure: string]: number };
  /** Members who saved something this month (the team left out). */
  members: number;
  minMembers: number;
  updatedAt?: any;
}

/** Whether there are enough members to show the numbers to everyone. */
export function showCommunity(c: CommunityImpact | null | undefined): boolean {
  return !!c && c.members >= c.minMembers && Object.values(c.totals || {}).some((v) => v > 0);
}
