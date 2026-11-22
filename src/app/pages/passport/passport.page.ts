import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Subject } from 'rxjs';
import { distinctUntilChanged, first, takeUntil } from 'rxjs/operators';
import { ImpactTile, impactTiles } from 'src/app/models/Impact';
import { ElementSlug, FirstStep, firstSteps, JOURNEY_ELEMENTS } from 'src/app/models/Journey';
import {
  buildStamps, challengeView, ChallengeView, earlierVersionNote, earnedBecause, elementStamps, istToday, journeyStamps, machineLines, memberNumber, milestoneStamps,
  nextStamps, PASSPORT_INK, Stamp, StampDef, stampDate, StampRecord
} from 'src/app/models/Passport';
import { ActivityService, EngagementMetrics } from 'src/app/services/activity.service';
import { AuthService } from 'src/app/services/auth.service';
import { BadgeShareService } from 'src/app/services/badge-share.service';
import { PassportHolder, PassportService } from 'src/app/services/passport.service';
import { UserProfile, UserProfileService } from 'src/app/services/user-profile.service';

/** The most stamps one page holds (two rows of two, so each stays large); more go on to another page. */
const STAMPS_PER_PAGE = 4;

type PageKind = 'cover' | 'inside' | 'identity' | 'milestones' | 'visas' | 'challenges' | 'element' | 'impact' | 'next' | 'notes' | 'insideBack' | 'back';

interface BookPage {
  kind: PageKind;
  /** For element pages. */
  element?: { slug: ElementSlug; name: string; icon: string; ink: string };
  /** For visa and challenge pages: which group of up to four stamps (0, 1, …). */
  part?: number;
  /** For milestone pages: which levels (0 = Earthrise, 3 = triangles … 6 = hexagons). */
  levels?: number[];
  /** Page heading on the right, e.g. "● ▲". */
  sub?: string;
  /** Printed page number (the covers have none). */
  number?: number;
  /** For the page label under the book. */
  label: string;
}

interface Leaf {
  front: number;
  back: number | null;
}

/** A believable member for the design preview (?demo=1, admins only): most stamps earned, a few still to go. */
const DEMO_METRICS: EngagementMetrics = {
  blogsRead: 18, qualityReads: 9, qualityReadsByElement: { water: 6, air: 5, earth: 2, energy: 1 },
  videosWatched: 6, videosCompleted: 4, conversationsWatched: 2, pollsVoted: 2, lastEqScore: 72, lastEqDate: new Date(), lastBlogReadDate: new Date(),
  totalActionsCompleted: 11, uniqueActionsCompleted: 5, actionsByElement: { water: 5, energy: 3, earth: 2, spirit: 1 }, lastActionAt: new Date(),
  impactTotals: { water: 420, energy: 4.4, co2: 6.2, plastic: 18, food: 1.5 }, impactByMonth: {},
  elementVisits: { water: 1, air: 1, energy: 1, earth: 1, spirit: 1 },
  ladder: { actionDays: 5, lastActionDay: null, elementDays: { water: 4, energy: 3, earth: 2, spirit: 1 }, elementLastDay: {}, actionWeeks: { a: 4 }, actionLastWeek: {} }
};
/** In the preview, these stay to be earned. */
const DEMO_UNEARNED = new Set(['snowflake', 'honeycomb', 'evergreen', 'one-family', 'thirty-dawns', 'knowledge-explorer', 'earth-explorer', 'energy-explorer', 'spirit-explorer', 'water-guardian', 'energy-guardian', 'earth-guardian', 'spirit-guardian', 'air-guardian']);

/** Loose stamps on the desk around the book (wide screens): decoration, not anything earned. */
const DESK_STAMPS: Stamp[] = [
  { title: ['Planet', 'Earth'], caption: 'ONE FAMILY', shape: 'circle', rotation: -14 },
  { title: ['Drop by', 'drop'], caption: 'WATER', shape: 'oval', rotation: 9 },
  { title: ['Small', 'actions'], caption: 'EVERY DAY', shape: 'rect', rotation: 12 },
  { title: ['Five', 'elements'], caption: 'JOURNEY', shape: 'pentagon', rotation: -8 }
].map((d, i) => ({
  name: d.title.join(' '),
  id: `desk-${i}`, family: 'travel', meaning: '', element: null, ink: '#A6875D', earned: true, earnedAt: null, dateKnown: true,
  progress: 1, target: 1, hint: '', unit: '', ...d
} as Stamp));

/** Per device: the "Welcome to your Planet Passport" moment shows once. */
const ISSUED_SEEN_KEY = (uid: string) => `wiof_passport_issued_seen_${uid}`;

/**
 * Planet Passport (docs/PLANET_PASSPORT_DESIGN.md, v1 proposal): a booklet
 * the member pages through. Two pages side by side on wide screens, one page
 * on phones; turn by tapping a page edge, swiping, the arrow keys or the
 * buttons below. Stamps and their dates are the server's records.
 * Before the Passport is issued (Earthrise: all 5 first steps), a closed
 * cover waits with the steps.
 */
@Component({
  selector: 'app-passport',
  templateUrl: './passport.page.html',
  styleUrls: ['./passport.page.scss'],
  standalone: false
})
export class PassportPage implements OnInit, OnDestroy {
  pages: BookPage[] = this.buildPages(1, 1);

  metrics: EngagementMetrics | null = null;
  profile: UserProfile | null = null;
  defs: StampDef[] = [];
  records: StampRecord[] = [];
  /** challengeId → count, from passport_challenge_progress. */
  challengeProgress: Record<string, number> = {};
  holder: PassportHolder | null = null;
  uid = '';
  /** ?demo=1, for admins only: sample stamps for design review. */
  demo = false;
  loading = true;
  /** The "Welcome to your Planet Passport" moment, once per device. */
  welcome = false;
  /** The stamp whose details are open (tap a stamp). */
  detail: Stamp | null = null;
  private detailReturnFocus: HTMLElement | null = null;

  readonly deskStamps = DESK_STAMPS;
  /** Hero illustrations already shown, so each loads only when first needed. */
  heroes: string[] = ['home'];

  stamps: Stamp[] = [];
  next: Stamp[] = [];
  steps: FirstStep[] = [];
  impact: ImpactTile[] = [];
  memberNo = '';
  mrz: [string, string] = ['', ''];

  /** Wide screens show spreads, phones one page. */
  spread = true;
  pageWidth = 400;
  /** Leaves turned so far. */
  turned = 0;
  /** The leaf in mid-turn, kept on top until it lands. */
  turning: number | null = null;
  private turnTimer: any;
  private pointerX: number | null = null;
  private pointerT = 0;
  /** A page held and dragged: which leaf, which way, and its angle now (0 flat on the right, -180 on the left). */
  drag: { leaf: number; dir: 1 | -1; angle: number; lastX: number; lastT: number; speed: number } | null = null;
  private destroy$ = new Subject<void>();
  private userChange$ = new Subject<void>();
  /** ?stamp=: the page to open on, once the stamps are in. */
  private openOnStamp: string | null = null;

  constructor(
    private authService: AuthService,
    private activityService: ActivityService,
    private userProfileService: UserProfileService,
    private passportService: PassportService,
    public badgeShare: BadgeShareService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.measure();
    // Again once this page's header has rendered, for its real height.
    setTimeout(() => this.measure());
    const wantsDemo = this.route.snapshot.queryParamMap.get('demo') === '1';
    // From the new-badge moment: open on that stamp's page (and skip the welcome, the moment just showed it).
    this.openOnStamp = this.route.snapshot.queryParamMap.get('stamp');
    this.authService.currentUser$
      .pipe(distinctUntilChanged((a, b) => a?.uid === b?.uid), takeUntil(this.destroy$))
      .subscribe((user) => {
        this.userChange$.next();
        this.uid = user?.uid || '';
        this.demo = false;
        if (!this.uid) {
          this.loading = false;
          return;
        }
        const until = takeUntil<any>(this.userChange$);
        if (wantsDemo) {
          this.userProfileService.getRole(this.uid).then((role) => {
            this.demo = role === 'admin';
            this.refresh();
          }).catch(() => undefined);
        }
        combineLatest([
          this.passportService.stampDefs(),
          this.passportService.stamps(this.uid),
          this.passportService.holder(this.uid),
          this.activityService.getActivityCounts(this.uid),
          this.userProfileService.getProfile(this.uid).pipe(first()),
          this.passportService.challengeProgress(this.uid)
        ]).pipe(until, takeUntil(this.destroy$)).subscribe({
          next: ([defs, records, holder, metrics, profile, challengeProgress]) => {
            this.challengeProgress = challengeProgress;
            const newlyIssued = !this.holder && !!holder;
            this.defs = defs;
            this.records = records;
            this.holder = holder;
            this.metrics = metrics;
            this.profile = profile;
            if (newlyIssued) this.noteIssued();
            this.refresh();
          },
          error: () => {
            this.loading = false;
          }
        });
      });
  }

  ngOnDestroy(): void {
    clearTimeout(this.turnTimer);
    this.userChange$.next();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private refresh(): void {
    const metrics = this.demo ? DEMO_METRICS : this.metrics;
    const profile = this.demo && this.profile ? { ...this.profile, longestStreak: Math.max(9, this.profile.longestStreak || 0) } : this.profile;
    const records = this.demo ? this.demoRecords() : this.records;
    this.stamps = buildStamps(this.defs, records, { metrics, profile });
    // More than four journey stamps or challenges continue on another page.
    const pagesFor = (n: number) => Math.max(1, Math.ceil(n / STAMPS_PER_PAGE));
    const visaPages = pagesFor(this.journey.length);
    const challengePages = pagesFor(this.challengeItems.length);
    const count = (kind: PageKind) => this.pages.filter((p) => p.kind === kind).length;
    if (visaPages !== count('visas') || challengePages !== count('challenges')) {
      this.pages = this.buildPages(visaPages, challengePages);
      this.turned = Math.min(this.turned, this.maxTurned);
    }
    this.next = nextStamps(this.stamps);
    this.steps = firstSteps(this.profile, this.metrics);
    this.impact = impactTiles(metrics?.impactTotals);
    this.memberNo = this.uid ? memberNumber(this.uid) : '';
    this.mrz = machineLines(this.fullName, this.memberNo, this.joined);
    this.loading = false;
    if (this.openOnStamp && this.issued && this.stamps.length) {
      const page = this.pageOfStamp(this.openOnStamp);
      this.openOnStamp = null;
      this.welcome = false;
      if (page >= 0) this.turnTo(this.spread ? Math.ceil(page / 2) : page);
    }
  }

  /** The booklet page a stamp sits on, or -1. */
  pageOfStamp(id: string): number {
    const s = this.stamps.find((x) => x.id === id);
    if (!s) return -1;
    if (s.element) return this.pages.findIndex((p) => p.kind === 'element' && p.element?.slug === s.element);
    if (s.family === 'milestone') return this.pages.findIndex((p) => p.kind === 'milestones' && this.milestones(p.levels).some((m) => m.id === id));
    if (s.family === 'challenge') return this.pages.findIndex((p) => p.kind === 'challenges' && this.challengeStamps(p.part).some((c) => c.stamp.id === id));
    return this.pages.findIndex((p) => p.kind === 'visas' && this.visaStamps(p.part).some((v) => v.id === id));
  }

  /** Sample records for the admin preview: dated over the last few weeks. */
  private demoRecords(): StampRecord[] {
    const day = 24 * 60 * 60 * 1000;
    return this.defs
      .filter((d) => d.status === 'active' && !DEMO_UNEARNED.has(d.id))
      .map((d, i) => ({ stampId: d.id, earnedAt: new Date(Date.now() - (40 - i) * day), dateKnown: d.family !== 'streak' }));
  }

  /** The Passport was just issued (or is opened for the first time since): show the welcome once, on the first stamps. */
  private noteIssued(): void {
    let seen = false;
    try {
      seen = localStorage.getItem(ISSUED_SEEN_KEY(this.uid)) === '1';
      localStorage.setItem(ISSUED_SEEN_KEY(this.uid), '1');
    } catch {
      // Storage blocked: show the welcome this time.
    }
    if (!seen && !this.openOnStamp) this.welcome = true;
  }

  // ---- A stamp's details: why it was earned, or how to earn it ----

  openDetail(stamp: Stamp): void {
    this.detailReturnFocus = document.activeElement as HTMLElement | null;
    this.detail = stamp;
    setTimeout(() => document.getElementById('stamp-detail')?.focus(), 30);
  }

  closeDetail(): void {
    this.detail = null;
    this.detailReturnFocus?.focus?.();
  }

  get detailWhy(): string {
    return this.detail ? earnedBecause(this.detail) : '';
  }

  get detailVersionNote(): string {
    return this.detail ? earlierVersionNote(this.detail) : '';
  }

  get detailDate(): string {
    const s = this.detail;
    if (!s?.earned) return '';
    if (!s.dateKnown || !s.earnedAt) return 'Earned before the Passport launched';
    return `Earned ${s.earnedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }

  /** "Open my Passport" on the welcome: turn to the first milestone page, where Earthrise lands. */
  openToEarthrise(): void {
    this.welcome = false;
    const index = this.pages.findIndex((p) => p.kind === 'milestones');
    this.turnTo(this.spread ? Math.ceil(index / 2) : index);
  }

  // ---- What the pages show ----

  /** The booklet opens once the Passport is issued (Earthrise). The admin preview is always open. */
  get issued(): boolean {
    return this.demo || !!this.holder;
  }

  get stepsDone(): number {
    return this.steps.filter((s) => s.done).length;
  }

  get fullName(): string {
    const p = this.profile;
    if (!p) return '';
    return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.displayName || '';
  }

  get initial(): string {
    return (this.fullName.trim()[0] || '?').toUpperCase();
  }

  get joined(): Date | null {
    const j: any = this.profile?.joinedDate;
    return j?.toDate ? j.toDate() : null;
  }

  get joinedText(): string {
    return this.joined ? stampDate(this.joined) : '—';
  }

  get issuedText(): string {
    if (this.demo) return stampDate(new Date());
    if (!this.holder) return '—';
    return this.holder.dateKnown && this.holder.issuedAt ? stampDate(this.holder.issuedAt) : 'Before launch';
  }

  get homeElements(): string {
    const names = (this.profile?.preferredElements || [])
      .map((s) => JOURNEY_ELEMENTS.find((e) => e.slug === s)?.name)
      .filter(Boolean);
    return names.length ? names.join(', ') : 'Still exploring';
  }

  get earnedCount(): number {
    return this.stamps.filter((s) => s.earned).length;
  }

  // ---- At a glance, beside the closed book ----

  /** The most recently earned stamp with a known date, else any earned one. */
  get latestStamp(): Stamp | null {
    const earned = this.stamps.filter((s) => s.earned);
    const dated = earned.filter((s) => s.dateKnown && s.earnedAt).sort((a, b) => b.earnedAt!.getTime() - a.earnedAt!.getTime());
    return dated[0] || earned[0] || null;
  }

  /** A challenge open now, if there is one. */
  get openChallenge(): Stamp | null {
    return this.challenges.open[0] || null;
  }

  latestDate(s: Stamp): string {
    return s.dateKnown && s.earnedAt ? s.earnedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'before launch';
  }

  /** "Open my Passport": past the cover, to the first pages. */
  openBook(): void {
    this.turnTo(1);
  }

  milestones(levels: number[] | undefined): Stamp[] {
    return milestoneStamps(this.stamps, levels || []);
  }

  /** One visa page's stamps: up to four. */
  visaStamps(part = 0): Stamp[] {
    return this.journey.slice(part * STAMPS_PER_PAGE, (part + 1) * STAMPS_PER_PAGE);
  }

  get journey(): Stamp[] {
    return journeyStamps(this.stamps);
  }

  /** Every challenge on the Challenges pages, in order: open, upcoming, then past earned ones. */
  get challengeItems(): { stamp: Stamp; upcoming: boolean; index: number }[] {
    const c = this.challenges;
    return [
      ...c.open.map((stamp, index) => ({ stamp, upcoming: false, index })),
      ...c.upcoming.map((stamp, index) => ({ stamp, upcoming: true, index })),
      ...c.past.map((stamp, index) => ({ stamp, upcoming: false, index }))
    ];
  }

  /** One Challenges page's challenges: up to four. */
  challengeStamps(part = 0): { stamp: Stamp; upcoming: boolean; index: number }[] {
    return this.challengeItems.slice(part * STAMPS_PER_PAGE, (part + 1) * STAMPS_PER_PAGE);
  }

  /** Open, upcoming (from 7 days before) and past earned challenges. */
  get challenges(): ChallengeView {
    return challengeView(this.stamps, this.challengeProgress, istToday());
  }

  elementStamps(slug: ElementSlug): Stamp[] {
    return elementStamps(this.stamps, slug);
  }

  earnedIn(slug: ElementSlug): number {
    return this.elementStamps(slug).filter((s) => s.earned).length;
  }

  /** The scene behind the book follows the page: an element's illustration on its page, the home one elsewhere. */
  get hero(): string {
    const el = this.openPages.map((i) => this.pages[i]).find((p) => p.kind === 'element');
    return el?.element?.slug || 'home';
  }

  /** Adds the scene for the pages now open, so its image starts loading. */
  private noteHero(): void {
    if (!this.heroes.includes(this.hero)) this.heroes = [...this.heroes, this.hero];
  }

  // ---- The booklet ----

  private buildPages(visaPages: number, challengePages: number): BookPage[] {
    const elements = JOURNEY_ELEMENTS.map((e) => ({ slug: e.slug, name: e.name, icon: e.icon, ink: PASSPORT_INK[e.slug] }));
    const pages: BookPage[] = [
      { kind: 'cover', label: 'Cover' },
      { kind: 'inside', label: 'Inside cover' },
      { kind: 'identity', label: 'Holder' },
      { kind: 'milestones', levels: [0, 3], sub: '● ▲', label: 'Milestones' },
      // One shape per page from here: at most four stamps a page, so each stays large.
      { kind: 'milestones', levels: [4], sub: '■', label: 'Milestones' },
      { kind: 'milestones', levels: [5], sub: '⬟', label: 'Milestones' },
      { kind: 'milestones', levels: [6], sub: '⬢', label: 'Milestones' },
      ...Array.from({ length: visaPages }, (_, part) => ({ kind: 'visas' as const, part, label: 'Journey visas' })),
      ...Array.from({ length: challengePages }, (_, part) => ({ kind: 'challenges' as const, part, label: 'Challenges' })),
      ...elements.map((element) => ({ kind: 'element' as const, element, label: element.name })),
      { kind: 'impact', label: 'Declaration' },
      { kind: 'next', label: 'Next stamps' },
      { kind: 'notes', label: 'Travel notes' }
    ];
    // On a spread the back cover must be the back of the last leaf (an odd index), or the
    // closed book shows its outside as a right-hand page and then a blank one. An inside
    // back cover, as a real passport has, evens the count whenever a page is added.
    if (pages.length % 2 === 0) pages.push({ kind: 'insideBack', label: 'Inside back cover' });
    pages.push({ kind: 'back', label: 'Back cover' });
    let num = 1;
    for (const p of pages) if (p.kind !== 'cover' && p.kind !== 'back' && p.kind !== 'inside' && p.kind !== 'insideBack') p.number = num++;
    return pages;
  }

  get leaves(): Leaf[] {
    if (!this.spread) return this.pages.map((_, i) => ({ front: i, back: null }));
    const out: Leaf[] = [];
    for (let i = 0; i < this.pages.length; i += 2) out.push({ front: i, back: i + 1 < this.pages.length ? i + 1 : null });
    return out;
  }

  /** The most leaves that can be turned: all of them on a spread (back cover shows), all but the last on a phone. */
  get maxTurned(): number {
    return this.spread ? this.leaves.length : this.pages.length - 1;
  }

  /** The pages showing now. */
  get openPages(): number[] {
    if (!this.spread) return [this.turned];
    return [this.turned * 2 - 1, this.turned * 2].filter((i) => i >= 0 && i < this.pages.length);
  }

  isOpen(i: number | null): boolean {
    return i !== null && this.openPages.includes(i);
  }

  get position(): string {
    const open = this.openPages.map((i) => this.pages[i]);
    const labels = [...new Set(open.map((p) => p.label))].join(' · ');
    const nums = open.map((p) => p.number).filter((x): x is number => !!x);
    return nums.length ? `${labels} · page ${nums.join('–')}` : labels;
  }

  /** Closed book on a spread: the cover sits in the middle, not on the right half. */
  get shift(): string {
    if (!this.spread) return '0px';
    if (this.turned === 0) return `${-this.pageWidth / 2}px`;
    if (this.turned === this.leaves.length) return `${this.pageWidth / 2}px`;
    return '0px';
  }

  zIndex(i: number): number {
    if (this.turning === i) return this.leaves.length + 2;
    return i < this.turned ? i + 1 : this.leaves.length - i;
  }

  turnTo(target: number): void {
    const t = Math.max(0, Math.min(this.maxTurned, target));
    if (t === this.turned) return;
    this.turning = t > this.turned ? this.turned : t;
    this.turned = t;
    this.noteHero();
    clearTimeout(this.turnTimer);
    this.turnTimer = setTimeout(() => (this.turning = null), 900);
  }

  forward(): void {
    this.turnTo(this.turned + 1);
  }

  backward(): void {
    this.turnTo(this.turned - 1);
  }

  /** Tapping a page: the right-hand one turns forward, the left-hand one back. */
  tapLeaf(i: number, event: Event): void {
    if ((event.target as HTMLElement).closest('a, button')) return;
    if (i < this.turned) this.backward();
    else this.forward();
  }

  // ---- Holding a page: it follows the finger (or the pressed touchpad) like paper ----

  pointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    this.pointerX = e.clientX;
    this.pointerT = e.timeStamp;
  }

  pointerMove(e: PointerEvent): void {
    if (this.pointerX === null) return;
    const dx = e.clientX - this.pointerX;
    if (!this.drag) {
      if (Math.abs(dx) < 8) return; // still a tap
      const dir: 1 | -1 = dx < 0 ? 1 : -1;
      const leaf = dir === 1 ? this.turned : this.turned - 1;
      if (leaf < 0 || (dir === 1 && this.turned >= this.maxTurned)) return;
      this.drag = { leaf, dir, angle: dir === 1 ? 0 : -180, lastX: e.clientX, lastT: e.timeStamp, speed: 0 };
      this.turning = leaf; // on top of the others while it moves
      clearTimeout(this.turnTimer);
      (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
    }
    const d = this.drag;
    // Half a spread's width (one page) of travel takes the page all the way over.
    const p = Math.max(0, Math.min(1, (d.dir === 1 ? -dx : dx) / Math.max(120, this.pageWidth)));
    d.angle = d.dir === 1 ? -180 * p : -180 + 180 * p;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.speed = (e.clientX - d.lastX) / dt; // px per ms, signed
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
  }

  pointerUp(e: PointerEvent): void {
    if (this.pointerX === null) return;
    const dx = e.clientX - this.pointerX;
    const quick = e.timeStamp - this.pointerT < 300;
    this.pointerX = null;
    const d = this.drag;
    if (!d) {
      // A quick flick without a hold still turns, as before.
      if (quick && Math.abs(dx) > 45) dx < 0 ? this.forward() : this.backward();
      return;
    }
    this.drag = null;
    this.swallowNextClick();
    const progress = d.dir === 1 ? -d.angle / 180 : (180 + d.angle) / 180;
    const flick = d.dir === 1 ? d.speed < -0.5 : d.speed > 0.5;
    const flung = d.dir === 1 ? d.speed > 0.5 : d.speed < -0.5;
    if (!flung && (progress > 0.4 || flick)) {
      d.dir === 1 ? this.forward() : this.backward();
    } else {
      // Let go early: the page falls back where it was.
      this.turnTimer = setTimeout(() => (this.turning = null), 600);
    }
  }

  pointerCancel(): void {
    this.pointerX = null;
    if (this.drag) {
      this.drag = null;
      this.turnTimer = setTimeout(() => (this.turning = null), 600);
    }
  }

  /** The held leaf's angle, for its inline transform; null when it isn't held. */
  dragAngle(i: number): string | null {
    return this.drag && this.drag.leaf === i ? `rotateY(${this.drag.angle}deg)` : null;
  }

  /** How far up the held page is lifted (0 flat, 1 standing up), for its shading. */
  dragLift(i: number): number {
    return this.drag && this.drag.leaf === i ? Math.sin((-this.drag.angle * Math.PI) / 180) : 0;
  }

  /** After a drag, the click that follows the release mustn't open a stamp or turn again. */
  private swallowNextClick(): void {
    const stop = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener('click', stop, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 50);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (this.detail) {
      if (e.key === 'Escape') this.closeDetail();
      return; // the sheet is open: the arrow keys don't turn pages behind it
    }
    if (!this.issued || (e.target as HTMLElement)?.closest?.('input, textarea')) return;
    if (e.key === 'ArrowRight') this.forward();
    if (e.key === 'ArrowLeft') this.backward();
  }

  @HostListener('window:resize')
  measure(): void {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const wasSpread = this.spread;
    this.spread = w >= 900;
    // The whole book and its controls should fit the window's height too (short laptop
    // and tablet screens): leave room for the site header and the page-turn controls.
    const h = typeof window !== 'undefined' ? window.innerHeight : 900;
    // The site header stays on screen above the scrolling page.
    const header = typeof document !== 'undefined' ? document.querySelector('app-header')?.getBoundingClientRect().height || 64 : 64;
    const byHeight = Math.max(220, (h - header - 190) / 1.42);
    const byWidth = this.spread ? Math.min(430, (w - 96) / 2) : Math.min(400, w - 32);
    this.pageWidth = Math.floor(Math.min(byWidth, byHeight));
    if (wasSpread !== this.spread) {
      // Keep roughly the same place in the book when the layout changes.
      this.turned = this.spread ? Math.ceil(this.turned / 2) : Math.max(0, this.turned * 2 - 1);
      this.turned = Math.min(this.turned, this.maxTurned);
    }
  }
}
