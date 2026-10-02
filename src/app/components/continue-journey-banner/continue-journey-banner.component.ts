import { Component, Input, OnChanges } from '@angular/core';
import { ELEMENT_SELECT } from 'src/app/app.constants';

const ELEMENT_CYCLE = [
  ELEMENT_SELECT.AIR,
  ELEMENT_SELECT.ENERGY,
  ELEMENT_SELECT.WATER,
  ELEMENT_SELECT.EARTH,
  ELEMENT_SELECT.SPIRIT
];

// Same one-line taglines used on the home page's Five Elements row
// (life-elements.component.html) — kept in sync manually since that's markup
// text, not a shared constant.
const ELEMENT_TAGLINES: { [key: string]: string } = {
  [ELEMENT_SELECT.AIR]: 'Moves. Connects. Carries change.',
  [ELEMENT_SELECT.ENERGY]: 'Illuminates. Reveals. Activates action.',
  [ELEMENT_SELECT.WATER]: 'Flows. Adapts. Sustains life.',
  [ELEMENT_SELECT.EARTH]: 'Grounds us. Connects us to place.',
  [ELEMENT_SELECT.SPIRIT]: 'Reflects. Expands. Deepens understanding.'
};

/**
 * "Continue the journey" marigold CTA banner at the bottom of each element
 * page, cycling Air -> Energy -> Water -> Earth -> Spirit -> Air.
 */
@Component({
  selector: 'app-continue-journey-banner',
  templateUrl: './continue-journey-banner.component.html',
  styleUrls: ['./continue-journey-banner.component.scss']
})
export class ContinueJourneyBannerComponent implements OnChanges {
  @Input() element: string;

  nextElement: string;
  nextElementLabel: string;
  nextElementTagline: string;

  ngOnChanges(): void {
    const currentIndex = ELEMENT_CYCLE.indexOf((this.element || '').toLowerCase());
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % ELEMENT_CYCLE.length : 0;
    this.nextElement = ELEMENT_CYCLE[nextIndex];
    this.nextElementLabel = this.nextElement.charAt(0).toUpperCase() + this.nextElement.slice(1);
    this.nextElementTagline = ELEMENT_TAGLINES[this.nextElement];
  }
}
