import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, catchError, expand, reduce } from 'rxjs/operators';
import { Video } from '../models/Video';
import { ENDPOINTS } from '../app.constants';
import { environment } from 'src/environments/environment';
import { EMPTY, Observable, of } from 'rxjs';

const MAX_PLAYLIST_PAGES = 10;

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

  /** First page only (up to 25, newest first) — enough for element-page
   *  sliders. Use getAllPlaylistVideos() where the full list matters. */
  getYoutubePlaylist(id: string) {
    return this.fetchPlaylistPage(id).pipe(
      map((page) => this.sortNewestFirst(this.toVideos(page.items))),
      catchError(() => {
        return of([]);
      })
    );
  }

  /** Every video in the playlist, following YouTube's nextPageToken (50 per
   *  page, the API max). Capped at MAX_PLAYLIST_PAGES as a quota guard. */
  getAllPlaylistVideos(id: string): Observable<Video[]> {
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
