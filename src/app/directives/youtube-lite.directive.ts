import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';
import { YOUTUBE_EMBED_VIDEO_LINK } from '../app.constants';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Click-to-play for YouTube embeds. Until the visitor clicks, the iframe shows
 * a tiny same-page poster (the video's thumbnail and a play button) through
 * `srcdoc`, so the ~500 KB YouTube player is only downloaded for videos
 * someone actually plays. Clicking navigates the same iframe to the real
 * player with autoplay on.
 *
 * The iframe element itself never changes: its classes, sizing, [src] binding
 * and other directives (YoutubeWatchTrackerDirective, the single-playback
 * handshake on iframe load) keep working as before.
 *
 * Usage: <iframe [src]="safeEmbedUrl" [appYoutubeLite]="videoId" ...>
 * An id that isn't a valid YouTube id leaves the iframe as a normal embed.
 */
@Directive({
  selector: 'iframe[appYoutubeLite]'
})
export class YoutubeLiteDirective implements OnChanges {
  @Input('appYoutubeLite') videoId: string;

  constructor(private el: ElementRef<HTMLIFrameElement>, private renderer: Renderer2) {}

  ngOnChanges(): void {
    const iframe = this.el.nativeElement;
    const id = (this.videoId || '').trim();
    if (!YOUTUBE_ID.test(id)) {
      this.renderer.removeAttribute(iframe, 'srcdoc');
      return;
    }
    // Delegates autoplay to the player, so one click starts the video.
    this.renderer.setAttribute(iframe, 'allow', 'autoplay; encrypted-media; fullscreen');
    this.renderer.setAttribute(iframe, 'srcdoc', this.poster(id));
  }

  /** `id` is validated against YOUTUBE_ID, so it is safe to put into markup. */
  private poster(id: string): string {
    const player = YOUTUBE_EMBED_VIDEO_LINK.replace('VIDEO_ID', id) + '&autoplay=1&playsinline=1';
    return (
      '<style>' +
      'html,body{margin:0;height:100%;overflow:hidden;background:#000}' +
      'a{position:absolute;inset:0;display:block;cursor:pointer}' +
      'img{width:100%;height:100%;object-fit:cover}' +
      'svg{position:absolute;left:50%;top:50%;width:68px;height:48px;margin:-24px 0 0 -34px;transition:transform .15s}' +
      'a:hover svg,a:focus-visible svg{transform:scale(1.1)}' +
      'a:focus-visible{outline:3px solid #ffc36b;outline-offset:-3px}' +
      '</style>' +
      `<a href="${player}" aria-label="Play video">` +
      `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="">` +
      '<svg viewBox="0 0 68 48" aria-hidden="true">' +
      '<path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.3.3 34 .3 34 .3s-21.3 0-26.5 1.4a8.5 8.5 0 0 0-6 6C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.5 8.5 0 0 0 6 6C12.7 47.7 34 47.7 34 47.7s21.3 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35 67.9 24 67.9 24s0-11-1.4-16.3z" fill="#f00"/>' +
      '<path d="M45 24 27 14v20z" fill="#fff"/>' +
      '</svg></a>'
    );
  }
}
