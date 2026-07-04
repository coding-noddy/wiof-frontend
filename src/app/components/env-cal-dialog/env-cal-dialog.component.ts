import {
  HostListener,
  Component,
  OnInit,
  Output,
  Input,
  EventEmitter
} from '@angular/core';
// import { EventEmitter } from 'protractor';

import { BREAKING_NEWS_SLIDER_OPTIONS } from 'src/app/app.constants';

@Component({
  selector: 'app-env-cal-dialog',
  templateUrl: './env-cal-dialog.component.html',
  styleUrls: ['./env-cal-dialog.component.scss']
})
export class EnvCalDialogComponent implements OnInit {
  @Input() occasionDetails: any;
  @Output() close: EventEmitter<any> = new EventEmitter();
  width: number;
  slideOpts = BREAKING_NEWS_SLIDER_OPTIONS;
  showNavigation: boolean = false;
  imageLoadState: { [key: number]: { loaded: boolean; error: boolean } } = {};

  @HostListener('window:resize', [])
  public onResize() {
    this.detectScreenSize();
  }
  months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  constructor() {}

  ngAfterViewInit() {
    this.detectScreenSize();
  }

  ngOnInit() {
    this.resetNavigation();
  }

  ngDestroy() {
    this.showNavigation = false;
  }

  getMonth(month) {
    this.resetNavigation();
    return this.months[month];
  }

  resetNavigation() {
    this.showNavigation = false;
    if (this.occasionDetails.occasion.length > 1) {
      this.showNavigation = true;
    }
  }

  detectScreenSize() {
    this.width = window.innerWidth;
  }

  onImageLoad(index: number) {
    this.imageLoadState[index] = { loaded: true, error: false };
  }

  onImageError(index: number) {
    this.imageLoadState[index] = { loaded: false, error: true };
  }

  isImageLoaded(index: number) {
    return this.imageLoadState[index]?.loaded === true;
  }

  isImageError(index: number) {
    return this.imageLoadState[index]?.error === true;
  }

  closeDialog() {
    this.close.emit('close');
  }
}
