import { Component, OnInit, HostListener } from '@angular/core';

@Component({
  selector: 'app-onboarding-overlay',
  templateUrl: './onboarding-overlay.component.html',
  styleUrls: ['./onboarding-overlay.component.scss']
})
export class OnboardingOverlayComponent implements OnInit {
  visible = false;

  readonly elements = [
    { name: 'Earth', description: 'Grounding practices for physical wellness', icon: 'leaf-outline', color: '#4caf50' },
    { name: 'Water', description: 'Emotional balance and mental clarity', icon: 'water-outline', color: '#2196f3' },
    { name: 'Air', description: 'Breathwork and mindfulness', icon: 'cloud-outline', color: '#90a4ae' },
    { name: 'Energy', description: 'Vitality and sustainable living', icon: 'flash-outline', color: '#ff9800' },
    { name: 'Spirit', description: 'Purpose, connection, and inner wisdom', icon: 'sparkles-outline', color: '#9c27b0' }
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
