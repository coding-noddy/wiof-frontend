import { Component, OnInit } from '@angular/core';
import { LaunchCeremonyService, LaunchCeremonySetting } from '../../../services/launch-ceremony.service';

@Component({
  selector: 'app-launch-ceremony',
  templateUrl: './launch-ceremony.page.html',
  styleUrls: ['./launch-ceremony.page.scss']
})
export class LaunchCeremonyPage implements OnInit {
  setting: LaunchCeremonySetting | null = null;
  isLoading = true;
  loadError = false;
  saving = false;
  saveError = '';
  previewReady = false;

  constructor(private launchCeremony: LaunchCeremonyService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.loadError = false;
    this.launchCeremony.getSetting().subscribe({
      next: (setting) => {
        this.setting = setting;
        this.isLoading = false;
      },
      error: () => {
        this.loadError = true;
        this.isLoading = false;
      }
    });
  }

  toggle(): void {
    if (!this.setting || this.saving) {
      return;
    }
    const next = !this.setting.enabled;
    this.saving = true;
    this.saveError = '';
    this.launchCeremony.setEnabled(next).subscribe({
      next: () => {
        this.setting = { enabled: next, updatedAt: new Date(), updatedBy: 'you' };
        this.saving = false;
      },
      error: () => {
        this.saveError = "Couldn't save. Check you're signed in as an admin and try again.";
        this.saving = false;
      }
    });
  }

  /** Lets an admin see the ceremony again in this browser (it normally shows
   *  once per visitor). Opens the home page in a new tab. */
  previewOnThisBrowser(): void {
    try {
      localStorage.removeItem('wiof_launch_ribbon_cut');
      localStorage.setItem('wiof_launch_enabled', 'true');
    } catch {
      // ignore — preview just won't show if storage is blocked
    }
    this.previewReady = true;
    window.open('/home', '_blank', 'noopener');
  }

  updatedAtDate(): Date | null {
    const value = this.setting?.updatedAt;
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    return typeof value.toDate === 'function' ? value.toDate() : null;
  }
}
