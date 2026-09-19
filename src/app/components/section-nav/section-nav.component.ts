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
  // Always shown at the top of the page — the show/hide-on-scroll behaviour
  // was pulled after repeated regressions (premature reveal, then stuck
  // visible, then hidden immediately) chasing an Ionic scroll-container edge
  // case that wasn't worth the complexity.
  visible = true;

  private rafPending = false;

  ngOnInit() {
    if (this.sections.length > 0) {
      this.activeSection = this.sections[0].sectionId;
    }
  }

  /**
   * Call on every `(ionScroll)` from the page's own <ion-content> (with
   * [scrollEvents]="true" — Ionic doesn't emit ionScroll otherwise). Reaching
   * into ion-content's internal scroll element and attaching a raw DOM
   * listener directly (an earlier version of this component did that) turned
   * out to be unreliable after an in-app route change to another element
   * page: the very first page load worked, but scrolling on a page reached
   * via a client-side navigation never updated the active pill. Ionic's own
   * (ionScroll) output is the documented, zone-safe way to observe content
   * scrolling and doesn't have that failure mode.
   */
  handleScroll() {
    if (this.rafPending) {
      return;
    }
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      this.updateActiveSection();
    });
  }

  private updateActiveSection() {
    const triggerY = 140;
    let current = '';
    // Looked up fresh every time rather than cached once: sections like
    // Conversations/Videos sit behind `*ngIf="... | async"` in the page
    // templates and don't exist in the DOM yet when this component first
    // initializes (before their Firestore/HTTP data resolves) — a one-time
    // getElementById at setup silently dropped them from tracking forever,
    // which is exactly why those two pills never lit up.
    for (const s of this.sections) {
      const el = document.getElementById(s.sectionId);
      if (el && el.getBoundingClientRect().top <= triggerY) {
        current = s.sectionId;
      }
    }
    if (!current) {
      current = this.sections[0]?.sectionId ?? '';
    }
    const match = this.sections.find((s) => s.sectionId === current);
    if (match && !match.disabled) {
      this.activeSection = current;
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
