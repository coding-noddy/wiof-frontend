import { Injectable } from '@angular/core';

/**
 * Client-side rate limiter that throttles Firestore writes to 1 per second per key.
 * Keys are typically composed of collection + userId (e.g., "activity_log_uid123").
 *
 * This serves as defense-in-depth alongside Firestore Security Rules rate limiting.
 * If a write is throttled, it can be retried via scheduleRetry (max 2 attempts, 2s delay).
 * On final failure, writes are silently discarded without user-facing errors.
 */
@Injectable({ providedIn: 'root' })
export class RateLimiterService {
  private lastWriteTimestamps: Map<string, number> = new Map();
  private pendingRetries: Map<string, number> = new Map();

  private static readonly THROTTLE_MS = 1000;
  private static readonly RETRY_DELAY_MS = 2000;
  private static readonly MAX_RETRIES = 2;

  /**
   * Checks whether a write for the given key can proceed immediately.
   * Returns true if the last write for this key was more than 1 second ago
   * (or if no previous write exists), and updates the timestamp.
   * Returns false if throttled.
   */
  canWrite(key: string): boolean {
    const now = Date.now();
    const lastWrite = this.lastWriteTimestamps.get(key);

    if (lastWrite === undefined || (now - lastWrite) >= RateLimiterService.THROTTLE_MS) {
      this.lastWriteTimestamps.set(key, now);
      return true;
    }

    return false;
  }

  /**
   * Schedules a retry for a throttled write operation.
   * Retries after a 2-second delay, up to a maximum of 2 attempts per key.
   * If all retries fail or are exhausted, the write is silently discarded.
   */
  scheduleRetry(key: string, writeFn: () => Promise<void>): void {
    const currentAttempts = this.pendingRetries.get(key) || 0;

    if (currentAttempts >= RateLimiterService.MAX_RETRIES) {
      // Max retries exhausted — silently discard
      this.pendingRetries.delete(key);
      return;
    }

    this.pendingRetries.set(key, currentAttempts + 1);

    setTimeout(async () => {
      if (this.canWrite(key)) {
        try {
          await writeFn();
        } catch (error) {
          console.warn('RateLimiter: retry write failed', error);
        }
        this.pendingRetries.delete(key);
      } else {
        // Still throttled — attempt another retry
        this.scheduleRetry(key, writeFn);
      }
    }, RateLimiterService.RETRY_DELAY_MS);
  }
}
