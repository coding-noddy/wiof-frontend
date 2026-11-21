import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Stamp, stampDateText } from 'src/app/models/Passport';

let nextId = 0;

/**
 * One Passport stamp, drawn as SVG: an inked, slightly tilted stamp when
 * earned (the ink texture is the page's #wiof-ink filter), a faint dashed
 * outline with the progress when not.
 *
 * Shapes carry meaning (docs/PLANET_PASSPORT_DESIGN.md §3a): milestones are
 * polygons with as many corners as the number they count (circle for
 * Earthrise), travel stamps are ovals and rectangles, streak stamps rosettes.
 */
@Component({
  selector: 'app-passport-stamp',
  templateUrl: './passport-stamp.component.html',
  styleUrls: ['./passport-stamp.component.scss'],
  standalone: false
})
export class PassportStampComponent {
  @Input({ required: true }) stamp!: Stamp;
  /** Overrides the middle line of an earned stamp (the desk decorations use "★ ★ ★"). */
  @Input() date: string | null = null;
  /** Order on the page, so stamps land one after another. */
  @Input() index = 0;
  /** Show "Share" under an earned stamp (the booklet; not the desk decorations or the preview). */
  @Input() shareable = false;
  @Output() share = new EventEmitter<Stamp>();

  readonly uid = `stamp-${nextId++}`;

  /** A regular polygon's corners around (80, cy): a vertex on top, except the square and hexagon, which sit flat. */
  polygonPoints(sides: number, r: number, cy = 80): string {
    const offset = sides === 4 ? Math.PI / 4 : sides === 6 ? 0 : -Math.PI / 2;
    return Array.from({ length: sides }, (_, i) => {
      const a = offset + (2 * Math.PI * i) / sides;
      return `${(80 + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
  }

  /** A scalloped rosette edge: 18 small arcs around a circle. */
  rosettePath(r: number): string {
    const count = 18;
    const pt = (i: number) => {
      const a = (2 * Math.PI * i) / count - Math.PI / 2;
      return `${(80 + r * Math.cos(a)).toFixed(1)},${(80 + r * Math.sin(a)).toFixed(1)}`;
    };
    const bump = (r * Math.PI / count) * 1.05;
    let d = `M ${pt(0)}`;
    for (let i = 1; i <= count; i++) d += ` A ${bump.toFixed(1)} ${bump.toFixed(1)} 0 0 1 ${pt(i)}`;
    return `${d} Z`;
  }

  /** The triangle's text sits lower, where it's wide enough. */
  get isTriangle(): boolean {
    return this.stamp.shape === 'triangle';
  }

  /** y of each title line, centred around the middle (lower in a triangle). */
  lineY(i: number): number {
    const lines = this.stamp.title.length;
    const lineGap = this.isTriangle ? 16 : 19;
    // Lower in a triangle and a pentagon, where those shapes are widest.
    const base = this.isTriangle ? 98 : this.stamp.shape === 'pentagon' ? 90 : 80;
    return base + (i - (lines - 1) / 2) * lineGap - (this.stamp.earned ? 6 : 8);
  }

  get dateText(): string {
    return this.date || stampDateText(this.stamp);
  }

  get label(): string {
    const s = this.stamp;
    const name = s.name;
    if (s.earned) {
      const when = s.dateKnown && s.earnedAt ? `, ${s.earnedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : s.dateKnown ? '' : ', before launch';
      return `${name} stamp, earned${when}. ${s.meaning}`;
    }
    return `${name} stamp, not yet earned: ${s.hint} (${s.progress} of ${s.target})`;
  }
}
