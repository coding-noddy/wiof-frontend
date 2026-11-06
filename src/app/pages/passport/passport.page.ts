import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { distinctUntilChanged, first, takeUntil } from 'rxjs/operators';
import { ImpactTile, impactTiles } from 'src/app/models/Impact';
import { ElementSlug, JOURNEY_ELEMENTS } from 'src/app/models/Journey';
import { elementStamps, journeyStamps, machineLines, memberNumber, nextStamps, passportStamps, PASSPORT_INK, Stamp } from 'src/app/models/Passport';
import { ActivityService, EngagementMetrics } from 'src/app/services/activity.service';
import { AuthService } from 'src/app/services/auth.service';
import { UserProfile, UserProfileService } from 'src/app/services/user-profile.service';

type PageKind = 'cover' | 'inside' | 'identity' | 'visas' | 'element' | 'impact' | 'next' | 'notes' | 'back';

interface BookPage {
  kind: PageKind;
  /** For element pages. */
  element?: { slug: ElementSlug; name: string; icon: string; ink: string };
  /** For the two visa pages: which half of the journey stamps. */
  part?: 0 | 1;
  /** Printed page number (the covers have none). */
  number?: number;
  /** For the page label under the book. */
  label: string;
}

interface Leaf {
  front: number;
  back: number | null;
}

/** A believable member for the design preview (?demo=1): most stamps earned, a few still to go. */
const DEMO_METRICS: EngagementMetrics = {
  blogsRead: 18, qualityReads: 14, qualityReadsByElement: { water: 6, air: 5, earth: 2, energy: 1 },
  videosWatched: 6, videosCompleted: 4, pollsVoted: 2, lastEqScore: 72, lastEqDate: new Date(), lastBlogReadDate: new Date(),
  totalActionsCompleted: 11, uniqueActionsCompleted: 8, actionsByElement: { water: 5, energy: 3, earth: 2, spirit: 1 }, lastActionAt: new Date(),
  impactTotals: { water: 420, energy: 4.4, co2: 6.2, plastic: 18, food: 1.5 }, impactByMonth: {}
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const stampDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/**
 * Planet Passport, design experiment (docs/PLANET_PASSPORT_DESIGN.md): a
 * booklet the member pages through. Two pages side by side on wide screens,
 * one page on phones; turn by tapping a page edge, swiping, the arrow keys
 * or the buttons below.
 */
@Component({
  selector: 'app-passport',
  templateUrl: './passport.page.html',
  styleUrls: ['./passport.page.scss'],
  standalone: false
})
export class PassportPage implements OnInit, OnDestroy {
  readonly pages: BookPage[] = this.buildPages();

  metrics: EngagementMetrics | null = null;
  profile: UserProfile | null = null;
  uid = '';
  demo = false;
  loading = true;

  stamps: Stamp[] = [];
  journey: Stamp[] = [];
  next: Stamp[] = [];
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
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private activityService: ActivityService,
    private userProfileService: UserProfileService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.measure();
    this.demo = this.route.snapshot.queryParamMap.get('demo') === '1';
    this.authService.currentUser$
      .pipe(distinctUntilChanged((a, b) => a?.uid === b?.uid), takeUntil(this.destroy$))
      .subscribe((user) => {
        this.uid = user?.uid || '';
        if (!this.uid) {
          this.loading = false;
          return;
        }
        this.userProfileService.getProfile(this.uid).pipe(first(), takeUntil(this.destroy$)).subscribe((p) => {
          this.profile = p;
          this.refresh();
        });
        if (this.demo) {
          this.metrics = DEMO_METRICS;
          this.refresh();
          return;
        }
        this.activityService.getActivityCounts(this.uid).pipe(first(), takeUntil(this.destroy$)).subscribe({
          next: (m) => {
            this.metrics = m;
            this.refresh();
          },
          error: () => {
            this.metrics = null;
            this.refresh();
          }
        });
      });
  }

  ngOnDestroy(): void {
    clearTimeout(this.turnTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private refresh(): void {
    const profile = this.demo && this.profile ? { ...this.profile, longestStreak: Math.max(9, this.profile.longestStreak || 0) } : this.profile;
    this.stamps = passportStamps({ metrics: this.metrics, profile });
    this.journey = journeyStamps(this.stamps);
    this.next = nextStamps(this.stamps);
    this.impact = impactTiles(this.metrics?.impactTotals);
    this.memberNo = this.uid ? memberNumber(this.uid) : '';
    this.mrz = machineLines(this.fullName, this.memberNo, this.joined);
    this.loading = !this.metrics && !this.profile;
  }

  // ---- What the pages show ----

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

  get homeElements(): string {
    const names = (this.profile?.preferredElements || [])
      .map((s) => JOURNEY_ELEMENTS.find((e) => e.slug === s)?.name)
      .filter(Boolean);
    return names.length ? names.join(', ') : 'Still exploring';
  }

  get earnedCount(): number {
    return this.stamps.filter((s) => s.earned).length;
  }

  /** The preview shows a date in each earned stamp; real dates come when the server records them. */
  get previewDate(): string | null {
    return this.demo ? stampDate(new Date()) : null;
  }

  visas(part: 0 | 1 | undefined): Stamp[] {
    return part === 1 ? this.journey.slice(4) : this.journey.slice(0, 4);
  }

  elementStamps(slug: ElementSlug): Stamp[] {
    return elementStamps(this.stamps, slug);
  }

  earnedIn(slug: ElementSlug): number {
    return this.elementStamps(slug).filter((s) => s.earned).length;
  }

  // ---- The booklet ----

  private buildPages(): BookPage[] {
    const elements = JOURNEY_ELEMENTS.map((e) => ({ slug: e.slug, name: e.name, icon: e.icon, ink: PASSPORT_INK[e.slug] }));
    const pages: BookPage[] = [
      { kind: 'cover', label: 'Cover' },
      { kind: 'inside', label: 'Inside cover' },
      { kind: 'identity', label: 'Holder' },
      { kind: 'visas', part: 0, label: 'Journey visas' },
      { kind: 'visas', part: 1, label: 'Journey visas' },
      ...elements.map((element) => ({ kind: 'element' as const, element, label: element.name })),
      { kind: 'impact', label: 'Declaration' },
      { kind: 'next', label: 'Next stamps' },
      { kind: 'notes', label: 'Travel notes' },
      { kind: 'back', label: 'Back cover' }
    ];
    let num = 1;
    for (const p of pages) if (p.kind !== 'cover' && p.kind !== 'back' && p.kind !== 'inside') p.number = num++;
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

  isOpen(i: number): boolean {
    return this.openPages.includes(i);
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

  pointerDown(e: PointerEvent): void {
    this.pointerX = e.clientX;
  }

  pointerUp(e: PointerEvent): void {
    if (this.pointerX === null) return;
    const dx = e.clientX - this.pointerX;
    this.pointerX = null;
    if (Math.abs(dx) > 45) dx < 0 ? this.forward() : this.backward();
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if ((e.target as HTMLElement)?.closest?.('input, textarea')) return;
    if (e.key === 'ArrowRight') this.forward();
    if (e.key === 'ArrowLeft') this.backward();
  }

  @HostListener('window:resize')
  measure(): void {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const wasSpread = this.spread;
    this.spread = w >= 900;
    this.pageWidth = Math.floor(this.spread ? Math.min(430, (w - 96) / 2) : Math.min(400, w - 32));
    if (wasSpread !== this.spread) {
      // Keep roughly the same place in the book when the layout changes.
      this.turned = this.spread ? Math.ceil(this.turned / 2) : Math.max(0, this.turned * 2 - 1);
      this.turned = Math.min(this.turned, this.maxTurned);
    }
  }
}
