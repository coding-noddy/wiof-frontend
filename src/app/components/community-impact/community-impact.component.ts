import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { combineLatest, from, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { COMMUNITY_IMPACT_COLLECTION, CommunityImpact, showCommunity } from 'src/app/models/CommunityImpact';
import { impactLines, impactMonth } from 'src/app/models/Impact';
import { AuthService } from 'src/app/services/auth.service';
import { UserProfileService } from 'src/app/services/user-profile.service';

/** "about 1,200 L of water, about 30 kg of CO₂ and 40 plastic items avoided". */
export function communitySentence(c: CommunityImpact, max = 3): string {
  const parts = impactLines(c.totals).slice(0, max).map((l) => l.text);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export interface CommunityView {
  members: number;
  sentence: string;
  /** Shown only because an admin is looking: not enough members for everyone yet. */
  preview: boolean;
  minMembers: number;
}

/** What to show: everyone sees it from the minimum; admins always, as a preview. */
export function communityView(c: CommunityImpact | null | undefined, isAdmin: boolean): CommunityView | null {
  if (!c) return null;
  const sentence = communitySentence(c);
  if (showCommunity(c)) return { members: c.members, sentence, preview: false, minMembers: c.minMembers };
  return isAdmin ? { members: c.members, sentence, preview: true, minMembers: c.minMembers } : null;
}

/**
 * "Together this month" (8.15.0) on Take Action: what WIOF members saved
 * together this month, from the public monthly summary
 * (functions/community-impact.js). Everyone sees it once enough members
 * contributed (the admin-set minimum, 20 by default), so early numbers never
 * read as a failure and no one can be picked out. Admins always see it,
 * marked as a preview, to check how it looks.
 */
@Component({
  selector: 'app-community-impact',
  templateUrl: './community-impact.component.html',
  styleUrls: ['./community-impact.component.scss'],
  standalone: false
})
export class CommunityImpactComponent implements OnInit {
  view$: Observable<CommunityView | null> = of(null);

  constructor(
    private firestore: AngularFirestore,
    private auth: AuthService,
    private profiles: UserProfileService
  ) {}

  ngOnInit(): void {
    const summary$ = this.firestore
      .doc<CommunityImpact>(`${COMMUNITY_IMPACT_COLLECTION}/${impactMonth()}`)
      .get()
      .pipe(map((snap) => snap.data() || null), catchError(() => of(null)));
    const isAdmin$ = this.auth.currentUser$.pipe(
      switchMap((user) => (user ? from(this.profiles.getRole(user.uid)).pipe(map((role) => role === 'admin')) : of(false))),
      catchError(() => of(false))
    );
    this.view$ = combineLatest([summary$, isAdmin$]).pipe(map(([c, isAdmin]) => communityView(c, isAdmin)));
  }
}
