import {
  Directive,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ElementRef
} from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { first } from 'rxjs/operators';

export interface BlogReadCompleteEvent {
  contentId: string;
  scrollDepth: number;
  timeSpent: number;
}

/**
 * Directive that tracks blog read completion based on scroll depth and time spent.
 *
 * Place on the blog article content container element. It monitors how much of the
 * content the user has scrolled through and how long they've spent reading. When both
 * scroll depth exceeds 75% AND time spent exceeds 60% of the estimated reading time,
 * it emits a `qualityReadComplete` event.
 *
 * Only activates for authenticated users. Falls back to scroll event listener if
 * IntersectionObserver is unavailable.
 *
 * Usage:
 * ```html
 * <div appBlogReadTracker [contentId]="blog.id" [wordCount]="blog.wordCount"
 *      (qualityReadComplete)="onReadComplete($event)">
 *   ...blog content...
 * </div>
 * ```
 */
@Directive({ selector: '[appBlogReadTracker]' })
export class BlogReadTrackerDirective implements OnInit, OnDestroy {
  @Input() contentId: string = '';
  @Input() wordCount: number = 0;

  /** Emitted once when the quality read threshold is met. */
  @Output() qualityReadComplete = new EventEmitter<BlogReadCompleteEvent>();

  private scrollDepth = 0;
  private startTime: number = 0;
  private completed = false;
  private observer: IntersectionObserver | null = null;
  private checkInterval: any = null;
  private scrollListener: (() => void) | null = null;
  private isActive = false;

  /** Check interval in milliseconds */
  private static readonly CHECK_INTERVAL_MS = 3000;

  constructor(
    private elementRef: ElementRef,
    private afAuth: AngularFireAuth
  ) {}

  /**
   * Estimated time to read in seconds: wordCount / 200 words-per-minute * 60 seconds.
   */
  get timeToRead(): number {
    return (this.wordCount / 200) * 60;
  }

  async ngOnInit(): Promise<void> {
    // Only activate for authenticated users
    const user = await this.afAuth.authState.pipe(first()).toPromise();
    if (!user) {
      return;
    }

    this.isActive = true;
    this.startTime = Date.now();
    this.initScrollTracking();
    this.startThresholdCheck();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Evaluates whether the quality read threshold has been met.
   * Fires completion when scrollDepth > 75 AND timeSpent > timeToRead * 0.6.
   * Sets completed = true to prevent duplicate firing.
   */
  checkThreshold(): void {
    if (this.completed || !this.isActive) {
      return;
    }

    const timeSpent = this.getTimeSpentSeconds();
    const requiredTime = this.timeToRead * 0.6;

    if (this.scrollDepth > 75 && timeSpent > requiredTime) {
      this.completed = true;
      this.qualityReadComplete.emit({
        contentId: this.contentId,
        scrollDepth: this.scrollDepth,
        timeSpent: Math.floor(timeSpent)
      });
    }
  }

  /**
   * Returns time spent in seconds since the directive was initialized.
   */
  private getTimeSpentSeconds(): number {
    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * Initializes scroll depth tracking using IntersectionObserver if available,
   * falling back to scroll event listener otherwise.
   */
  private initScrollTracking(): void {
    // Intersection ratio measures visible area, not how far the article was read.
    // Track document scrolling so long articles can reach the completion threshold.
    this.initScrollListener();
  }

  /**
   * Sets up IntersectionObserver with threshold markers at every 5% (0.05 to 1.0)
   * to measure how much of the content is visible/scrolled past.
   */
  private initIntersectionObserver(): void {
    const thresholds = this.generateThresholds();

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const visibleRatio = entry.intersectionRatio;
          const depthPercent = Math.floor(visibleRatio * 100 / 5) * 5;

          if (depthPercent > this.scrollDepth) {
            this.scrollDepth = depthPercent;
          }
        }
      },
      {
        threshold: thresholds
      }
    );

    this.observer.observe(this.elementRef.nativeElement);
  }

  /**
   * Generates threshold values at every 5% increment (0.05, 0.10, ..., 1.0).
   */
  private generateThresholds(): number[] {
    const thresholds: number[] = [];
    for (let i = 0.05; i <= 1.0; i += 0.05) {
      thresholds.push(Math.round(i * 100) / 100);
    }
    return thresholds;
  }

  /**
   * Fallback: uses scroll event listener to calculate scroll depth
   * when IntersectionObserver is unsupported.
   */
  private initScrollListener(): void {
    const element = this.elementRef.nativeElement as HTMLElement;

    this.scrollListener = () => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementHeight = element.offsetHeight;

      if (elementHeight === 0) {
        return;
      }

      // Calculate how much of the element has scrolled past the viewport top
      const scrolledPast = Math.max(0, -rect.top + windowHeight);
      const rawPercent = (scrolledPast / elementHeight) * 100;
      const depthPercent = Math.min(100, Math.floor(rawPercent / 5) * 5);

      if (depthPercent > this.scrollDepth) {
        this.scrollDepth = depthPercent;
      }
    };

    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  /**
   * Starts the periodic threshold check interval.
   */
  private startThresholdCheck(): void {
    this.checkInterval = setInterval(() => {
      this.checkThreshold();
    }, BlogReadTrackerDirective.CHECK_INTERVAL_MS);
  }

  /**
   * Cleans up all observers, intervals, and event listeners.
   */
  private cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = null;
    }

    this.isActive = false;
  }
}
