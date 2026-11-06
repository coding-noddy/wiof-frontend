import { Component, Input, Optional } from '@angular/core';
import { ImpactTile, impactMonth, impactTiles, monthName } from 'src/app/models/Impact';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { EngagementMetrics } from 'src/app/services/activity.service';
import { renderShareCard, shareTitle } from 'src/app/util/impact-share-image';
import { UiUtilService } from 'src/app/util/UiUtilService';

export type ImpactPeriod = 'month' | 'total';

/** The caption that goes with the image: what, honestly, and where. */
export function shareCaption(tiles: ImpactTile[], period: ImpactPeriod, monthLabel: string, url: string): string {
  const when = period === 'month' ? `in ${monthLabel}` : 'so far';
  const what = tiles.slice(0, 3).map((t) => `${t.unit ? `${t.number} ${t.unit}` : t.number} ${t.label.replace(/ (saved|avoided)$/, '')}`).join(', ');
  return `My estimated impact ${when} with World Is One Family: ${what}. Small actions add up. Join me: ${url}`;
}

/**
 * "Your impact" on My Journey (8.17.0): one tile per measure, coloured by
 * element, this month or since the member started, and "Share my impact",
 * a square image made on the device (util/impact-share-image.ts). On
 * phones the share sheet opens with the image; elsewhere it downloads and
 * the caption is copied. The first name is on it only if they tick it.
 */
@Component({
  selector: 'app-impact-summary',
  templateUrl: './impact-summary.component.html',
  styleUrls: ['./impact-summary.component.scss'],
  standalone: false
})
export class ImpactSummaryComponent {
  @Input() metrics: EngagementMetrics | null = null;
  @Input() firstName: string | null = null;

  period: ImpactPeriod = 'month';
  showName = false;
  sharing = false;

  constructor(
    private uiUtil: UiUtilService,
    @Optional() private analytics?: AnalyticsService
  ) {}

  get monthLabel(): string {
    return monthName(impactMonth());
  }

  get monthTiles(): ImpactTile[] {
    return impactTiles(this.metrics?.impactByMonth?.[impactMonth()]);
  }

  get totalTiles(): ImpactTile[] {
    return impactTiles(this.metrics?.impactTotals);
  }

  get tiles(): ImpactTile[] {
    return this.period === 'month' ? this.monthTiles : this.totalTiles;
  }

  /** Shown at all once anything was saved, ever. */
  get hasAny(): boolean {
    return this.totalTiles.length > 0;
  }

  setPeriod(period: ImpactPeriod): void {
    this.period = period;
  }

  async share(): Promise<void> {
    const tiles = this.tiles;
    if (!tiles.length || this.sharing) return;
    this.sharing = true;
    try {
      const month = this.monthLabel.split(' ')[0];
      const blob = await renderShareCard({
        title: shareTitle(this.showName ? this.firstName : null),
        period: this.period === 'month' ? `this ${month}` : 'since I started',
        tiles,
        footnote: 'From the small actions I took with World Is One Family'
      });
      const url = `${window.location.origin}/take-action`;
      const caption = shareCaption(tiles, this.period, this.monthLabel, url);
      const file = new File([blob], 'wiof-my-impact.png', { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: 'My impact with WIOF', text: caption });
          this.analytics?.logImpactShared(this.period, 'share');
        } catch (err: any) {
          if (err?.name !== 'AbortError') throw err; // closing the share sheet is fine
        }
        return;
      }
      // Desktop: save the image and copy the caption to paste with it.
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10000);
      let copied = false;
      try {
        await navigator.clipboard.writeText(caption);
        copied = true;
      } catch {
        // Clipboard blocked: the image is still saved.
      }
      this.analytics?.logImpactShared(this.period, 'download');
      await this.uiUtil.presentToast(copied ? 'Image saved, and a caption copied: paste both into your post.' : 'Image saved: add it to your post.', 'success', 4000);
    } catch {
      await this.uiUtil.presentToast('Could not make the image. Please try again.', 'error');
    } finally {
      this.sharing = false;
    }
  }
}
