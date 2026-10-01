import { Component, OnInit, HostListener } from '@angular/core';

@Component({
  selector: 'app-onboarding-overlay',
  templateUrl: './onboarding-overlay.component.html',
  styleUrls: ['./onboarding-overlay.component.scss']
})
export class OnboardingOverlayComponent implements OnInit {
  visible = false;

  // Same order, colors and taglines as life-elements.component.html and
  // continue-journey-banner's ELEMENT_TAGLINES — one voice across the app.
  readonly elements = [
    { name: 'Air', description: 'Moves. Connects. Carries change.', icon: 'cloud-outline', color: '#21999F' },
    // Marigold-shade-20 (#CC9B59), not raw Marigold (#FFC26F) — this value
    // is used for both the icon color and the background tint (via
    // color-mix below), and raw Marigold is light enough that icon-on-its-
    // own-8%-tint failed contrast (~1.5:1). Every other element's color is
    // dark enough that this isn't an issue; Energy alone needed the shade.
    { name: 'Energy', description: 'Illuminates. Reveals. Activates action.', icon: 'flash-outline', color: '#CC9B59' },
    { name: 'Water', description: 'Flows. Adapts. Sustains life.', icon: 'water-outline', color: '#21999F' },
    { name: 'Earth', description: 'Grounds us. Connects us to place.', icon: 'leaf-outline', color: '#A6875D' },
    { name: 'Spirit', description: 'Reflects. Expands. Deepens understanding.', icon: 'sparkles-outline', color: '#21999F' }
  ];

  readonly features = [
    { name: 'Blogs', icon: 'newspaper-outline' },
    { name: 'Videos', icon: 'videocam-outline' },
    { name: 'Polls', icon: 'bar-chart-outline' },
    { name: 'Widgets', icon: 'apps-outline' }
  ];

  constructor() {}

  ngOnInit(): void {
    this.visible = this.shouldShowOverlay();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.visible) {
      this.dismiss();
    }
  }

  dismiss(): void {
    this.visible = false;
    try {
      localStorage.setItem('wiof_onboarding_seen', 'true');
    } catch {
      // localStorage unavailable — silently ignore
    }
  }

  private shouldShowOverlay(): boolean {
    try {
      return localStorage.getItem('wiof_onboarding_seen') === null;
    } catch {
      // localStorage unavailable — do not display overlay
      return false;
    }
  }
}
