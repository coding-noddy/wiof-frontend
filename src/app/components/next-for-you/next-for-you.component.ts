import { Component, Input } from '@angular/core';
import { elementName, NextForYou, NextPick } from 'src/app/models/NextForYou';

/**
 * "Next for you" in the home journey panel (Phase 2 step 7): up to four
 * rule-based picks, stories then actions, each with the reason it was
 * picked, and the elements they came from with a link to change them.
 * The picks come from NextForYouService; with none it shows nothing.
 */
@Component({
    selector: 'app-next-for-you',
    templateUrl: './next-for-you.component.html',
    styleUrls: ['./next-for-you.component.scss'],
    standalone: false
})
export class NextForYouComponent {
  @Input() picks: NextForYou | null = null;

  get items(): NextPick[] {
    return this.picks ? [...this.picks.read, ...this.picks.act] : [];
  }

  /** "Water and Earth" */
  get basisLabel(): string {
    const names = (this.picks?.elements || []).map(elementName);
    return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }

  kindLabel(pick: NextPick): string {
    const kind = pick.item.type === 'action' ? 'Action' : pick.item.type === 'video' ? 'Video' : 'Story';
    return pick.item.meta ? `${kind} · ${pick.item.meta}` : kind;
  }

  trackPick(_: number, pick: NextPick): string {
    return `${pick.item.type}:${pick.item.id}`;
  }
}
