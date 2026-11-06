import { Component, Input } from '@angular/core';
import { Stamp } from 'src/app/models/Passport';

let nextId = 0;

/**
 * One Passport stamp, drawn as SVG: an inked, slightly tilted stamp when
 * earned (the ink texture is the page's #wiof-ink filter), a faint dashed
 * outline with the progress when not.
 */
@Component({
  selector: 'app-passport-stamp',
  templateUrl: './passport-stamp.component.html',
  styleUrls: ['./passport-stamp.component.scss'],
  standalone: false
})
export class PassportStampComponent {
  @Input({ required: true }) stamp!: Stamp;
  /** Shown in the middle of an earned stamp: "06 NOV 2026", or "EARNED" until the server keeps dates. */
  @Input() date: string | null = null;
  /** Order on the page, so stamps land one after another. */
  @Input() index = 0;

  readonly uid = `stamp-${nextId++}`;

  /** The six corners of the hexagon frame. */
  hexPoints(r: number): string {
    return Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i;
      return `${80 + r * Math.cos(a)},${80 + r * Math.sin(a) * 0.86}`;
    }).join(' ');
  }

  /** y of each title line, centred around the middle. */
  lineY(i: number): number {
    const lines = this.stamp.title.length;
    return 80 + (i - (lines - 1) / 2) * 19 - (this.stamp.earned ? 6 : 8);
  }

  get label(): string {
    const s = this.stamp;
    return s.earned ? `${s.title.join(' ')} stamp, earned` : `${s.title.join(' ')} stamp, not yet earned: ${s.hint} (${s.progress} of ${s.target})`;
  }
}
