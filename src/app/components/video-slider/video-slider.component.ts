import {
  HostListener,
  Component,
  Input,
  OnInit,
  AfterViewInit
} from '@angular/core';
import { VIDEO_SLIDER_OPTIONS } from 'src/app/app.constants';
import { Video } from 'src/app/models/Video';

@Component({
  selector: 'app-video-slider',
  templateUrl: './video-slider.component.html',
  styleUrls: ['./video-slider.component.scss'],
  standalone: false
})
export class VideoSliderComponent implements OnInit, AfterViewInit {
  @Input() videoList: Array<Video>;
  @Input() element: string;
  videoSliderClass: string;
  width: number;
  slideOpts = VIDEO_SLIDER_OPTIONS;

  constructor() {}

  @HostListener('window:resize', [])
  public onResize() {
    this.detectScreenSize();
  }

  ngAfterViewInit() {
    this.detectScreenSize();
  }

  detectScreenSize() {
    this.width = window.innerWidth;
  }

  ngOnInit() {
    this.videoSliderClass = `wiof-${this.element}`;
  }

  showNavigator() {
    if (this.width >= 1024) {
      // slidesPerView: 4
      return this.videoList.length >= 5;
    } else if (this.width < 1024 && this.width >= 767) {
      // slidesPerView: 3
      return this.videoList.length >= 4;
    } else if (this.width < 767 && this.width >= 480) {
      // slidesPerView: 2
      return this.videoList.length >= 3;
    } else if (this.width < 480) {
      // slidesPerView: 1
      return this.videoList.length >= 2;
    }
  }
}
