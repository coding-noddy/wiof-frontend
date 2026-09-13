import { Component, Input, OnInit } from '@angular/core';

interface ElementDef {
  slug: string;
  name: string;
  description: string;
  colorClass: string;
}

@Component({
  selector: 'app-life-elements',
  templateUrl: './life-elements.component.html',
  styleUrls: ['./life-elements.component.scss']
})
export class LifeElementsComponent implements OnInit {
  @Input('element') selectedElement: string;

  /**
   * 'cards' — the home page's spacious "Every path starts with an element"
   * grid (icon + name + one-line description in a bordered card).
   * 'pills' — the compact element-switcher shown on each element page,
   * matching the mockup's breadcrumb pill row.
   */
  @Input() variant: 'cards' | 'pills' = 'cards';

  readonly elements: ElementDef[] = [
    { slug: 'air', name: 'Air', description: 'Moves. Connects. Carries change.', colorClass: 'teal' },
    { slug: 'energy', name: 'Energy', description: 'Illuminates. Reveals. Activates action.', colorClass: 'marigold' },
    { slug: 'water', name: 'Water', description: 'Flows. Adapts. Sustains life.', colorClass: 'teal' },
    { slug: 'earth', name: 'Earth', description: 'Grounds us. Connects us to place.', colorClass: 'brown' },
    { slug: 'spirit', name: 'Spirit', description: 'Reflects. Expands. Deepens understanding.', colorClass: 'teal' }
  ];

  constructor() {}

  ngOnInit() {}

  isSelectedElement(element: string) {
    return this.selectedElement === element;
  }
}
