import { Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ExploreItem } from '../models/RelatedContent';
import { ActivityService } from './activity.service';
import { AnalyticsService, SuggestionClick, SuggestionVia } from './analytics.service';
import { AuthService } from './auth.service';

/**
 * One call for a click on a suggestion (8.9.0): Google Analytics gets a
 * select_content event for every visitor, and a signed-in user's click is
 * also saved as a suggestion_click event, so the nightly stats can tell
 * whether suggestions lead to reads, watches and actions.
 */
@Injectable({ providedIn: 'root' })
export class SuggestionTrackingService {
  constructor(
    private analytics: AnalyticsService,
    private activity: ActivityService,
    private auth: AuthService
  ) {}

  clicked(via: SuggestionVia, item: ExploreItem, position: number, reason?: string): void {
    const click = suggestionClick(via, item, position, reason);
    if (!click) return;
    this.analytics.logSuggestionClick(click);
    this.auth.currentUser$.pipe(first()).subscribe((user) => {
      if (user) this.activity.logSuggestionClick(user.uid, click);
    });
  }
}

/**
 * The click as recorded, with the ID the later read, watch or completion
 * will carry: a story's slug or ID (the last part of its link, as the story
 * page logs it), a video's YouTube ID, an action's ID.
 */
export function suggestionClick(via: SuggestionVia, item: ExploreItem, position: number, reason?: string): SuggestionClick | null {
  const contentId = item.type === 'action' ? item.id : String(item.link?.[item.link.length - 1] || item.id || '');
  if (!contentId || contentId.length > 200) return null;
  return { via, contentType: item.type, contentId, position, reason: reason || item.reason };
}
