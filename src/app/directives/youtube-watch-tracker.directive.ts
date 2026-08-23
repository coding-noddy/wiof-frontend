import {
  Directive,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ElementRef,
  NgZone
} from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { first } from 'rxjs/operators';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
    _ytApiLoading?: boolean;
    _ytApiCallbacks?: (() => void)[];
  }
}

export interface VideoWatchCompleteEvent {
  contentId: string;
  watchPercent: number;
  videoTitle: string;
}

/**
 * Directive that tracks YouTube video watch completion via the IFrame API.
 *
 * Place on any YouTube embed <iframe>. It hooks into the YT Player API,
 * monitors playback progress, and emits `watchComplete` when the user
 * watches 75%+ of the video or it ends.
 *
 * Only activates for authenticated users. Fires at most once per directive instance.
 *
 * Usage:
 * ```html
 * <iframe
 *   appYoutubeWatchTracker
 *   [contentId]="videoId"
 *   [videoTitle]="title"
 *   [src]="safeUrl"
 *   (watchComplete)="onWatchComplete($event)"
 * ></iframe>
 * ```
 *
 * Note: The iframe src MUST include `enablejsapi=1` for the API to work.
 */
@Directive({ selector: '[appYoutubeWatchTracker]' })
export class YoutubeWatchTrackerDirective implements OnInit, OnDestroy {
  @Input() contentId: string = '';
  @Input() videoTitle: string = '';

  @Output() watchComplete = new EventEmitter<VideoWatchCompleteEvent>();

  private player: any = null;
  private watchCheckInterval: any = null;
  private completed = false;
  private isActive = false;

  private static idCounter = 0;

  constructor(
    private elementRef: ElementRef<HTMLIFrameElement>,
    private afAuth: AngularFireAuth,
    private ngZone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    // Only activate for authenticated users
    const user = await this.afAuth.authState.pipe(first()).toPromise();
    if (!user) return;

    this.isActive = true;
    this.loadYTApiAndInit();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Ensures the YouTube IFrame API script is loaded, then initializes the player.
   */
  private loadYTApiAndInit(): void {
    if (window.YT && window.YT.Player) {
      this.initPlayer();
      return;
    }

    // Register callback
    if (!window._ytApiCallbacks) {
      window._ytApiCallbacks = [];
    }
    window._ytApiCallbacks.push(() => this.ngZone.run(() => this.initPlayer()));

    // Load the script if not already loading
    if (!window._ytApiLoading) {
      window._ytApiLoading = true;

      const originalCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (originalCallback) originalCallback();
        // Fire all pending callbacks
        const callbacks = window._ytApiCallbacks || [];
        window._ytApiCallbacks = [];
        callbacks.forEach(cb => cb());
      };

      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      } else {
        // Script exists but YT not ready yet — just wait for callback
      }
    }
  }

  /**
   * Creates a YT.Player instance for the iframe element.
   */
  private initPlayer(): void {
    if (!this.isActive || this.completed) return;

    const iframe = this.elementRef.nativeElement;
    if (!iframe) return;

    // Ensure iframe has an ID (YT API requires it)
    if (!iframe.id) {
      iframe.id = `yt-tracker-${++YoutubeWatchTrackerDirective.idCounter}`;
    }

    // Ensure enablejsapi=1 is in the src
    const src = iframe.getAttribute('src') || '';
    if (!src.includes('enablejsapi=1')) {
      // Can't track without API enabled — skip silently
      return;
    }

    try {
      this.player = new window.YT.Player(iframe.id, {
        events: {
          onStateChange: (event: any) => this.ngZone.run(() => this.onStateChange(event))
        }
      });
    } catch (e) {
      console.warn('YouTube tracker: failed to create player', e);
    }
  }

  /**
   * Handles player state changes — starts/stops progress polling.
   */
  private onStateChange(event: any): void {
    if (this.completed) return;
    const YT = window.YT;
    if (!YT) return;

    if (event.data === YT.PlayerState.PLAYING) {
      this.startWatchCheck();
    } else if (event.data === YT.PlayerState.ENDED) {
      this.emitComplete(100);
    } else if (event.data === YT.PlayerState.PAUSED) {
      this.checkProgress();
    }
  }

  /**
   * Starts periodic progress polling (every 5 seconds).
   */
  private startWatchCheck(): void {
    if (this.watchCheckInterval) return;
    this.watchCheckInterval = setInterval(() => this.checkProgress(), 5000);
  }

  /**
   * Checks current watch percentage. Emits if >= 75%.
   */
  private checkProgress(): void {
    if (this.completed || !this.player) return;

    try {
      const currentTime = this.player.getCurrentTime?.();
      const duration = this.player.getDuration?.();
      if (duration && duration > 0) {
        const percent = (currentTime / duration) * 100;
        if (percent >= 75) {
          this.emitComplete(Math.floor(percent));
        }
      }
    } catch (e) {
      // Player not ready yet
    }
  }

  /**
   * Emits the watchComplete event once.
   */
  private emitComplete(watchPercent: number): void {
    if (this.completed) return;
    this.completed = true;
    this.stopWatchCheck();

    this.watchComplete.emit({
      contentId: this.contentId,
      watchPercent,
      videoTitle: this.videoTitle
    });
  }

  private stopWatchCheck(): void {
    if (this.watchCheckInterval) {
      clearInterval(this.watchCheckInterval);
      this.watchCheckInterval = null;
    }
  }

  private cleanup(): void {
    this.stopWatchCheck();
    this.isActive = false;
  }
}
