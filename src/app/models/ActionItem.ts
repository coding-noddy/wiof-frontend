/**
 * Firestore-backed Take Action catalogue entry (`actions/{actionId}`).
 * Named `ActionItem` rather than `TakeAction` to avoid colliding with the
 * existing static-data model in `take-action-content/take-action.ts`, which
 * stays in place until the static implementation is retired.
 */
export interface ActionItem {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  instructions: string[];

  // An action can belong to more than one element (e.g. watering a tree is
  // both Water and Earth) — unlike every other content type in this app,
  // which tags to exactly one element via a single `category` string.
  elementIds: string[];
  categories: string[];
  tags: string[];

  actionType: 'PERSONAL' | 'NATURE' | 'COMMUNITY' | 'EVENT';
  completionType: 'SELF_REPORTED';
  // REPEATABLE/OCCASIONAL both mean "no per-period dedup, mark done any
  // time" — see UserActionService.completeAction() and
  // TakeActionCardComponent.isDone. They're kept as separate values only to
  // describe cadence to the user (OCCASIONAL = infrequent/as-needed), not
  // because the app enforces a different rule for each.
  repeatType: 'ONCE' | 'DAILY' | 'REPEATABLE' | 'OCCASIONAL';

  estimatedDurationMinutes: number;
  difficulty: 'VERY_EASY' | 'EASY' | 'MODERATE';

  isActive: boolean;
  isFeatured: boolean;

  // Ionic icon name shown on action cards, set per-action by the admin.
  iconName: string;

  media: { type: 'YOUTUBE'; url: string } | null;

  // Sourcing for the action's claim/recommendation — shown in the card's
  // expandable detail so WIOF-curated actions are never presented as if
  // independently verified or officially endorsed (Section 9 of the
  // architecture doc). Optional since early/test content may not have it.
  evidence?: {
    level: 'OFFICIAL_SUPPORT' | 'WIDELY_ACCEPTED' | 'WIOF_CURATED';
    sourceOrganization: string;
    sourceTitle: string;
    sourceUrl: string;
    rationale: string;
    reviewedAt: string;
  } | null;

  // Real safety/accessibility guardrails an action may carry (e.g. "never
  // unplug medical devices") — content, not decoration; shown in the card's
  // expandable detail alongside evidence.
  safetyNotes?: string[];
  accessibilityNotes?: string[];

  displayOrder: number;

  // Bumped by ActionService.saveAction() on every admin edit (starts at 1
  // on create). Optional because every action seeded before this field
  // existed has none at all — UserActionService treats a missing version
  // as 1 (Phase 1's implicit, untracked baseline), so this is purely
  // additive and needs no backfill/migration of existing catalogue docs.
  version?: number;

  createdAt: any;
  updatedAt: any;
  createdBy: string;
  updatedBy: string;
}
