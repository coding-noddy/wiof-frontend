import { Component, OnInit } from '@angular/core';
import { buildStamps, challengeView, earnedWhen, istToday, Stamp, StampDef } from 'src/app/models/Passport';
import { PassportService } from 'src/app/services/passport.service';

interface BannerItem {
  stamp: Stamp;
  rule: string;
  when: string;
  open: boolean;
}

const SHORT_DAY = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/**
 * Planet Passport challenges on Take Action (decided 2026-11-21): a slim
 * banner while a challenge is open, or opening within 7 days. Where people
 * act, not on a page of its own. Public: guests see it too.
 */
@Component({
  selector: 'app-challenge-banner',
  templateUrl: './challenge-banner.component.html',
  styleUrls: ['./challenge-banner.component.scss'],
  standalone: false
})
export class ChallengeBannerComponent implements OnInit {
  items: BannerItem[] = [];

  constructor(private passport: PassportService) {}

  ngOnInit(): void {
    this.passport.stampDefs().subscribe((defs: StampDef[]) => {
      const byId = new Map(defs.map((d) => [d.id, d]));
      const view = challengeView(buildStamps(defs, [], { metrics: null, profile: null }), {}, istToday());
      const item = (s: Stamp, open: boolean): BannerItem => ({
        stamp: s,
        rule: earnedWhen(byId.get(s.id)!),
        when: open ? (s.window!.start === s.window!.end ? 'Today only' : `Open until ${SHORT_DAY(s.window!.end)}`) : `Opens ${SHORT_DAY(s.window!.start)}`,
        open
      });
      this.items = [...view.open.map((s) => item(s, true)), ...view.upcoming.map((s) => item(s, false))].slice(0, 2);
    });
  }
}