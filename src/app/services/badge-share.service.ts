import { Injectable } from '@angular/core';
import { Stamp } from '../models/Passport';
import { badgeShareCaption, renderBadgeCard } from '../util/badge-share-image';
import { shareOrDownload } from '../util/share-file';
import { UiUtilService } from '../util/UiUtilService';
import { AnalyticsService } from './analytics.service';

/** "Share this badge" (Passport §6): one earned stamp as an image, from the new-badge moment or the booklet. */
@Injectable({ providedIn: 'root' })
export class BadgeShareService {
  busy = false;

  constructor(private uiUtil: UiUtilService, private analytics: AnalyticsService) {}

  async share(stamp: Stamp): Promise<void> {
    if (this.busy || !stamp.earned) return;
    this.busy = true;
    try {
      const blob = await renderBadgeCard(stamp);
      const caption = badgeShareCaption(stamp, `${window.location.origin}/home`);
      const result = await shareOrDownload(blob, `wiof-${stamp.id}.png`, `${stamp.name}: my Planet Passport`, caption);
      if (result.method === 'cancel') return;
      this.analytics.logBadgeShared(stamp.id, result.method);
      if (result.method === 'download') {
        await this.uiUtil.presentToast(result.copied ? 'Image saved, and a caption copied: paste both into your post.' : 'Image saved: add it to your post.', 'success', 4000);
      }
    } catch {
      await this.uiUtil.presentToast('Could not make the image. Please try again.', 'error');
    } finally {
      this.busy = false;
    }
  }
}
