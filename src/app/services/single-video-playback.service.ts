import { Injectable, NgZone } from '@angular/core';

const YOUTUBE_ORIGIN = /^https:\/\/www\.youtube(-nocookie)?\.com$/;
const YOUTUBE_IFRAME = 'iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]';
/** YT.PlayerState.PLAYING */
const PLAYING = 1;

/**
 * Only one YouTube video plays at a time: when a visitor starts one, every
 * other embedded player on the page is paused.
 *
 * Works for every embed whose URL carries enablejsapi=1 (all of them build
 * from YOUTUBE_EMBED_VIDEO_LINK), for guests and signed-in users alike. It
 * talks to the players over the IFrame API's postMessage protocol directly,
 * so it neither needs the YT script nor conflicts with the YT.Player that
 * YoutubeWatchTrackerDirective attaches for signed-in users.
 */
@Injectable({
  providedIn: 'root'
})
export class SingleVideoPlaybackService {
  private started = false;
  /** Players that have answered our handshake (they now report state). */
  private readonly listening = new WeakSet<Window>();

  constructor(private zone: NgZone) {}

  start(): void {
    if (this.started || typeof window === 'undefined') {
      return;
    }
    this.started = true;

    // Outside Angular: player messages arrive several times a second while a
    // video plays and must not trigger change detection.
    this.zone.runOutsideAngular(() => {
      window.addEventListener('message', (event) => this.onMessage(event));
      // iframe load events don't bubble, but they do pass through a
      // capturing listener on the document.
      document.addEventListener(
        'load',
        (event) => {
          const target = event.target as HTMLElement;
          if (target instanceof HTMLIFrameElement && target.matches(YOUTUBE_IFRAME)) {
            this.handshake(target);
          }
        },
        true
      );
    });
  }

  /**
   * Asks a player to start reporting its state to this window. The player's
   * script may not be ready the moment the iframe loads, so retry a few times
   * until it answers.
   */
  private handshake(iframe: HTMLIFrameElement, attempt = 0): void {
    const win = iframe.contentWindow;
    if (!win || this.listening.has(win) || attempt > 10) {
      return;
    }
    win.postMessage(JSON.stringify({ event: 'listening', id: 'wiof-single-playback', channel: 'widget' }), '*');
    setTimeout(() => this.handshake(iframe, attempt + 1), 500);
  }

  private onMessage(event: MessageEvent): void {
    if (!YOUTUBE_ORIGIN.test(event.origin) || typeof event.data !== 'string') {
      return;
    }
    let data: any;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    const source = event.source as Window | null;
    if (source) {
      this.listening.add(source);
    }

    const isPlaying =
      (data.event === 'onStateChange' && data.info === PLAYING) ||
      (data.event === 'infoDelivery' && data.info?.playerState === PLAYING);
    if (isPlaying && source) {
      this.pauseAllExcept(source);
    }
  }

  private pauseAllExcept(playing: Window): void {
    document.querySelectorAll<HTMLIFrameElement>(YOUTUBE_IFRAME).forEach((iframe) => {
      const win = iframe.contentWindow;
      if (win && win !== playing) {
        win.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
      }
    });
  }
}
