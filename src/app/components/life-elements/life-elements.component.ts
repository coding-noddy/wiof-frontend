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

  /**
   * Extra path segment appended to each pill's link (pills variant only),
   * e.g. 'blogs' so the Blogs list page's own pills switch between elements'
   * Blogs lists rather than jumping to each element's home page — the
   * pills should keep you in the same section you're already looking at.
   * Empty string (default) keeps the plain element-home link used on
   * element pages' own switcher bar.
   */
  @Input() linkSuffix: string = '';

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

  pillLink(slug: string): string[] {
    return this.linkSuffix ? ['/element', slug, this.linkSuffix] : ['/element', slug];
  }
}
