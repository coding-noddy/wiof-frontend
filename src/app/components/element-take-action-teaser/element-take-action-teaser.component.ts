import { Component, Input, OnChanges } from '@angular/core';
import { TAKE_ACTION_DATA } from 'src/app/pages/take-action/take-action-data';

interface TakeActionLink {
  heading: string;
  desc: string;
  icon: string;
}

// One icon per real TAKE_ACTION_DATA heading (trimmed — a couple of source
// entries carry a trailing space) so the four cards read as distinct
// actions rather than four repeats of the same glyph.
const ACTION_ICONS: { [heading: string]: string } = {
  'Rethink your Food': 'restaurant-outline',
  'Revive the Soil': 'leaf-outline',
  'Handle waste and minimalize': 'trash-outline',
  'Treat other species humanely': 'paw-outline',
  'Solar Energy': 'sunny-outline',
  'Wind Energy': 'cloudy-outline',
  'Electric Vehicles': 'car-outline',
  'Bio-Fuels': 'flame-outline',
  'Take Public Transport': 'bus-outline',
  'Switch to Electric': 'car-sport-outline',
  'Handle Crop Wastage': 'home-outline',
  'Cleaner Cooking Fuel': 'flame-outline',
  'Rain-Water Harvesting': 'rainy-outline',
  'Use STP Water for Toilets': 'water-outline',
  'Treat Effluents': 'beaker-outline',
  'Desilting and Plantation': 'leaf-outline',
  'Yoga': 'accessibility-outline',
  'Meditation': 'moon-outline',
  'Gratitude': 'heart-outline',
  'Real Connections': 'people-outline'
};
const DEFAULT_ACTION_ICON = 'checkmark-circle-outline';

/**
 * "Small shifts, real impact" teaser shown on each element page — surfaces
 * the first 4 real take-action items for that element (from
 * TAKE_ACTION_DATA, the same data the full Take Action page uses) and links
 * through to it, rather than inventing separate copy.
 */
@Component({
  selector: 'app-element-take-action-teaser',
  templateUrl: './element-take-action-teaser.component.html',
  styleUrls: ['./element-take-action-teaser.component.scss']
})
export class ElementTakeActionTeaserComponent implements OnChanges {
  @Input() element: string;

  links: TakeActionLink[] = [];

  ngOnChanges(): void {
    const entry = TAKE_ACTION_DATA.find(
      (tab) => tab.tab.title.toLowerCase() === (this.element || '').toLowerCase()
    );
    this.links = entry
      ? entry.links.slice(0, 4).map((link) => ({
          heading: link.heading,
          desc: link.desc,
          icon: ACTION_ICONS[link.heading.trim()] || DEFAULT_ACTION_ICON
        }))
      : [];
  }
}
