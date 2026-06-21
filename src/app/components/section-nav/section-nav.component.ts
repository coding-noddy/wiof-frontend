import { Component, Input, OnInit } from '@angular/core';

export interface SectionNavItem {
  label: string;
  sectionId: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-section-nav',
  templateUrl: './section-nav.component.html',
  styleUrls: ['./section-nav.component.scss']
})
export class SectionNavComponent implements OnInit {
  @Input() sections: SectionNavItem[] = [];
  @Input() element: string = '';
  activeSection = '';

  ngOnInit() {
    if (this.sections.length > 0) {
      this.activeSection = this.sections[0].sectionId;
    }
  }

  scrollTo(sectionId: string) {
    this.activeSection = sectionId;
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
