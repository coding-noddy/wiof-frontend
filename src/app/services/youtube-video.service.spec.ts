import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { YoutubeVideoService } from './youtube-video.service';

/** An HttpClient stand-in: answers by URL, and records what was asked. */
function fakeHttp(answer: (url: string) => Observable<unknown>) {
  const urls: string[] = [];
  const http = { get: (url: string) => { urls.push(url); return answer(url); } } as unknown as HttpClient;
  return { http, urls };
}

const cached = {
  videos: [
    { videoId: 'new11111111', title: 'New', thumbnail: 'https://i.ytimg.com/new.jpg', publishedAt: '2026-11-01T00:00:00Z' },
    { videoId: 'old11111111', title: 'Old', thumbnail: 'https://i.ytimg.com/old.jpg', publishedAt: '2026-01-01T00:00:00Z' }
  ]
};
const youtubePage = {
  items: [{ snippet: { title: 'Direct', publishedAt: '2026-05-01T00:00:00Z', resourceId: { videoId: 'direct11111' }, thumbnails: { medium: { url: 'https://i.ytimg.com/d.jpg' } } } }]
};

describe('YoutubeVideoService', () => {
  it('reads a playlist from the server cache, without asking YouTube', async () => {
    const { http, urls } = fakeHttp(() => of(cached));
    const videos = await firstValueFrom(new YoutubeVideoService(http).getAllPlaylistVideos('PLx'));
    expect(videos.map((v) => v.url)).toEqual(['new11111111', 'old11111111']);
    expect(videos[0].publishedDate.getUTCFullYear()).toBe(2026);
    expect(urls).toEqual(['/api/youtube-playlist?id=PLx']);
  });

  it('asks YouTube directly when the server has no copy', async () => {
    const { http, urls } = fakeHttp((url) => (url.startsWith('/api/') ? throwError(() => new Error('503')) : of(youtubePage)));
    const videos = await firstValueFrom(new YoutubeVideoService(http).getYoutubePlaylist('PLx'));
    expect(videos.map((v) => v.url)).toEqual(['direct11111']);
    expect(urls.length).toBe(2);
    expect(urls[1]).toContain('googleapis.com/youtube/v3/playlistItems');
  });

  it('gives an empty list when both fail', async () => {
    const { http } = fakeHttp(() => throwError(() => new Error('down')));
    expect(await firstValueFrom(new YoutubeVideoService(http).getAllPlaylistVideos('PLx'))).toEqual([]);
  });
});
