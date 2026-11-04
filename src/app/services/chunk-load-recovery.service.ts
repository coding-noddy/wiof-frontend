import { Injectable } from '@angular/core';
import { NavigationError, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

const RELOADED_AT_KEY = 'wiof_chunk_reload_at';
const MIN_RELOAD_INTERVAL_MS = 60_000;

/**
 * True for the error a browser gives when a lazy-loaded code file (route
 * chunk) can't be loaded: Chrome/Edge, Safari and Firefox word it differently.
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? error ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    message
  );
}

/**
 * Each deploy replaces the hashed chunk files. A tab opened before a deploy
 * (or, for a few minutes after one, a CDN edge still serving the old
 * index.html) asks for chunk names that no longer exist, so opening a
 * lazy-loaded page fails and leaves it blank. When a navigation fails that
 * way, this reloads the target URL once to pick up the current build.
 * At most one reload a minute, so a genuinely missing file can't loop.
 */
@Injectable({
  providedIn: 'root'
})
export class ChunkLoadRecoveryService {
  constructor(private router: Router) {}

  start(): void {
    this.router.events
      .pipe(filter((event): event is NavigationError => event instanceof NavigationError))
      .subscribe((event) => {
        if (!isChunkLoadError(event.error) || this.reloadedRecently()) {
          return;
        }
        console.warn('[chunk-reload] Could not load the page code, reloading for the current version:', event.url);
        this.rememberReload();
        window.location.assign(event.url);
      });
  }

  private reloadedRecently(): boolean {
    try {
      return Date.now() - Number(sessionStorage.getItem(RELOADED_AT_KEY) || 0) < MIN_RELOAD_INTERVAL_MS;
    } catch {
      return false;
    }
  }

  private rememberReload(): void {
    try {
      sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()));
    } catch {
      // Storage blocked: the reload still happens, just without the loop guard.
    }
  }
}
