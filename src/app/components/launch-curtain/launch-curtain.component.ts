import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { LaunchCeremonyService } from '../../services/launch-ceremony.service';

type CurtainState = 'hidden' | 'closed' | 'cutting' | 'opening';

/** Set once a visitor has cut (or skipped) the ribbon — never shown again. */
const CUT_KEY = 'wiof_launch_ribbon_cut';
/** Last known "enabled" value, so a visitor who reloads before cutting gets
 *  the curtain straight away instead of a flash of the site first. */
const ENABLED_CACHE_KEY = 'wiof_launch_enabled';

/**
 * Launch window. Until this moment the curtain shows *immediately* on a
 * first visit and is then confirmed against Firestore (hidden again if the
 * admin switch is off). Asking Firestore first takes ~2-3s on a cold load,
 * which let visitors see the site before the curtain closed over it —
 * spoiling the reveal. After the window, the curtain only appears once
 * Firestore says it's on, so a visitor never sees a stray curtain flash
 * once the launch is over.
 */
const OPTIMISTIC_UNTIL = new Date('2026-10-12T23:59:59+05:30');

/** Pages that never show the ceremony. */
const EXCLUDED_PATH_PREFIXES = ['/admin-dashboard', '/login'];

interface ConfettiPiece {
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotate: number;
  wide: boolean;
}

const CONFETTI_COLORS = ['#FFC26F', '#7AC2C5', '#FFFCF6', '#CAB79E', '#21999F'];

@Component({
  selector: 'app-launch-curtain',
  templateUrl: './launch-curtain.component.html',
  styleUrls: ['./launch-curtain.component.scss']
})
export class LaunchCurtainComponent implements OnInit, OnDestroy {
  state: CurtainState = 'hidden';
  confetti: ConfettiPiece[] = [];

  @ViewChild('cutBtn') cutBtn?: ElementRef<HTMLButtonElement>;

  private sub?: Subscription;
  private timers: any[] = [];
  private readonly reducedMotion =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  constructor(private launchCeremony: LaunchCeremonyService) {}

  ngOnInit(): void {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    if (EXCLUDED_PATH_PREFIXES.some((p) => path.startsWith(p)) || this.read(CUT_KEY)) {
      return;
    }

    if (this.read(ENABLED_CACHE_KEY) === 'true' || Date.now() < OPTIMISTIC_UNTIL.getTime()) {
      this.show();
    }

    // Always re-check: an admin switching the ceremony off takes effect on
    // the visitor's next load, even if their cached value said "on".
    this.sub = this.launchCeremony.isEnabled().subscribe((enabled) => {
      this.write(ENABLED_CACHE_KEY, enabled ? 'true' : null);
      if (enabled) {
        this.show();
      } else if (this.state === 'closed') {
        this.state = 'hidden';
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.timers.forEach((t) => clearTimeout(t));
  }

  cutRibbon(): void {
    if (this.state !== 'closed') {
      return;
    }
    this.write(CUT_KEY, 'true');
    if (this.reducedMotion) {
      this.state = 'opening';
      this.after(400, () => (this.state = 'hidden'));
      return;
    }
    this.confetti = this.makeConfetti(70);
    this.state = 'cutting';
    this.after(650, () => (this.state = 'opening'));
    this.after(650 + 3200, () => (this.state = 'hidden'));
  }

  skip(): void {
    this.write(CUT_KEY, 'true');
    this.state = 'hidden';
  }

  private show(): void {
    if (this.state !== 'hidden') {
      return;
    }
    this.state = 'closed';
    // The welcome modal (behind this overlay) focuses its own close button
    // at 1s, and Ionic's gesture init can steal focus earlier still — so
    // focus the ribbon button after both.
    this.after(1300, () => this.cutBtn?.nativeElement.focus());
  }

  private makeConfetti(count: number): ConfettiPiece[] {
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.9,
      duration: 2.2 + Math.random() * 1.6,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotate: Math.floor(Math.random() * 360),
      wide: Math.random() > 0.5
    }));
  }

  private after(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string | null): void {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch {
      // localStorage unavailable — the ceremony just shows again next visit
    }
  }
}
