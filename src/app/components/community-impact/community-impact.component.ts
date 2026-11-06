import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { COMMUNITY_IMPACT_COLLECTION, CommunityImpact, showCommunity } from 'src/app/models/CommunityImpact';
import { impactLines, impactMonth } from 'src/app/models/Impact';

/** "about 1,200 L of water, about 30 kg of CO₂ and 40 plastic items avoided". */
export function communitySentence(c: CommunityImpact, max = 3): string {
  const parts = impactLines(c.totals).slice(0, max).map((l) => l.text);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * "Together this month" (8.15.0) on Take Action: what WIOF members saved
 * together this month, from the public monthly summary
 * (functions/community-impact.js). Nothing shows until enough members
 * contributed (minMembers, 20), so early numbers never read as a failure
 * and no one can be picked out.
 */
@Component({
  selector: 'app-community-impact',
  templateUrl: './community-impact.component.html',
  styleUrls: ['./community-impact.component.scss'],
  standalone: false
})
export class CommunityImpactComponent implements OnInit {
  view$: Observable<{ members: number; sentence: string } | null> = of(null);

  constructor(private firestore: AngularFirestore) {}

  ngOnInit(): void {
    this.view$ = this.firestore
      .doc<CommunityImpact>(`${COMMUNITY_IMPACT_COLLECTION}/${impactMonth()}`)
      .get()
      .pipe(
        map((snap) => {
          const c = snap.data();
          return c && showCommunity(c) ? { members: c.members, sentence: communitySentence(c) } : null;
        }),
        catchError(() => of(null))
      );
  }
}
