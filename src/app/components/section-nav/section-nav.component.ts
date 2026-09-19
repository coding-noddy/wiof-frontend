import { AfterViewInit, Component, Input, OnDestroy, OnInit } from '@angular/core';

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
export class SectionNavComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() sections: SectionNavItem[] = [];
  @Input() element: string = '';
  activeSection = '';
  // Hidden on load (the page already shows the element-switcher pills up top) —
  // only reveals once the hero has been scrolled past, so the two pill rows
  // never compete for attention at the same time.
  visible = false;

  private featuredObserver?: IntersectionObserver;
  private scrollSpyObserver?: IntersectionObserver;

  ngOnInit() {
    if (this.sections.length > 0) {
      this.activeSection = this.sections[0].sectionId;
    }
  }

  ngAfterViewInit() {
    // Watch the first section ("Featured", right after the hero) rather than
    // the hero itself — on a tall viewport the Featured section starts well
    // before the hero has fully scrolled out, so "hero fully gone" as a
    // trigger left the nav hidden far longer than intended.
    const target = this.sections[0] && document.getElementById(this.sections[0].sectionId);
    if (!target || typeof IntersectionObserver === 'undefined') {
      this.visible = true;
      return;
    }
    this.featuredObserver = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
      },
      // Shrink the effective viewport so the reveal fires once the section
      // is meaningfully in view, not the instant its edge peeks in.
      { threshold: 0, rootMargin: '-80px 0px -40% 0px' }
    );
    this.featuredObserver.observe(target);

    // Scroll-spy: highlight whichever pill's section is currently under a
    // thin band near the top of the viewport, not just the one last clicked.
    // Each section's top crosses that band once as you scroll past it, so
    // whichever fired most recently is the "active" one — the same trick
    // used above for the reveal, just with a much thinner trigger zone.
    this.scrollSpyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          const match = this.sections.find((s) => s.sectionId === entry.target.id);
          if (match && !match.disabled) {
            this.activeSection = match.sectionId;
          }
        });
      },
      { threshold: 0, rootMargin: '-96px 0px -75% 0px' }
    );
    this.sections.forEach((s) => {
      const el = document.getElementById(s.sectionId);
      if (el) {
        this.scrollSpyObserver!.observe(el);
      }
    });
  }

  ngOnDestroy() {
    this.featuredObserver?.disconnect();
    this.scrollSpyObserver?.disconnect();
  }

  scrollTo(sectionId: string) {
    this.activeSection = sectionId;
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
