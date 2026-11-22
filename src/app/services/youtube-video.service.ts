import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, catchError, expand, reduce, timeout } from 'rxjs/operators';
import { Video } from '../models/Video';
import { ENDPOINTS } from '../app.constants';
import { environment } from 'src/environments/environment';
import { EMPTY, Observable, of } from 'rxjs';

const MAX_PLAYLIST_PAGES = 10;

/** The server's cached copy of a playlist (functions/youtube-cache.js), served by Firebase Hosting. */
const CACHED_PLAYLIST = '/api/youtube-playlist';

interface CachedVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class YoutubeVideoService {
  constructor(private http: HttpClient) {}
  getYoutubeVideo(id: string) {
    return this.http.get(
      `${ENDPOINTS.YOUTUBE.VIDEO}?part=snippet&id=${id}&key=${environment.youtube_api_key}`
    );
  }

  /** The newest 25 — enough for element-page sliders. Use getAllPlaylistVideos()
   *  where the full list matters. */
  getYoutubePlaylist(id: string) {
    return this.cachedPlaylist(id).pipe(
      map((videos) => videos.slice(0, 25)),
      catchError(() => this.fetchPlaylistPage(id).pipe(map((page) => this.sortNewestFirst(this.toVideos(page.items))))),
      catchError(() => {
        return of([]);
      })
    );
  }

  /** Every video in the playlist: the server's cached copy, or else from YouTube itself
   *  (50 per page, the API max, capped at MAX_PLAYLIST_PAGES as a quota guard). */
  getAllPlaylistVideos(id: string): Observable<Video[]> {
    return this.cachedPlaylist(id).pipe(catchError(() => this.allPagesFromYouTube(id)));
  }

  /**
   * The server's copy (fetched from YouTube at most once an hour for everyone), newest first.
   * Errors when the server has none, or off Firebase Hosting (ng serve): callers then ask YouTube.
   */
  private cachedPlaylist(id: string): Observable<Video[]> {
    return this.http.get<{ videos: CachedVideo[] }>(`${CACHED_PLAYLIST}?id=${encodeURIComponent(id)}`).pipe(
      timeout(8000),
      map((body) => {
        if (!body || !Array.isArray(body.videos)) throw new Error('No cached playlist');
        return body.videos.map((v) => ({ thumbnail: v.thumbnail, title: v.title, url: v.videoId, publishedDate: new Date(v.publishedAt) }) as Video);
      })
    );
  }

  /** Straight from YouTube, following nextPageToken: the fallback when the server's copy isn't there. */
  private allPagesFromYouTube(id: string): Observable<Video[]> {
    let pagesFetched = 0;
    return this.fetchPlaylistPage(id, undefined, 50).pipe(
      expand((page) => {
        pagesFetched++;
        return page.nextPageToken && pagesFetched < MAX_PLAYLIST_PAGES
          ? this.fetchPlaylistPage(id, page.nextPageToken, 50)
          : EMPTY;
      }),
      reduce((videos: Video[], page) => videos.concat(this.toVideos(page.items)), []),
      map((videos) => this.sortNewestFirst(videos)),
      catchError(() => {
        return of([]);
      })
    );
  }

  private fetchPlaylistPage(id: string, pageToken?: string, maxResults = 25) {
    const tokenParam = pageToken ? `&pageToken=${pageToken}` : '';
    return this.http.get<any>(
      `${ENDPOINTS.YOUTUBE.PLAYLIST}?part=snippet&maxResults=${maxResults}&playlistId=${id}${tokenParam}&key=${environment.youtube_api_key}`
    );
  }

  private toVideos(items: any[]): Video[] {
    return (items || [])
      // Private/deleted playlist entries come back without thumbnails —
      // skip them rather than letting one bad entry fail the whole list.
      .filter((item) => item?.snippet?.thumbnails?.medium?.url)
      .map((playlist_item) => {
        return {
          thumbnail: playlist_item.snippet.thumbnails.medium.url,
          title: playlist_item.snippet.title,
          url: playlist_item.snippet.resourceId.videoId,
          publishedDate: new Date(playlist_item.snippet.publishedAt)
        } as Video;
      });
  }

  private sortNewestFirst(videos: Video[]): Video[] {
    return videos.sort((a, b) => b.publishedDate.getTime() - a.publishedDate.getTime());
  }
}
