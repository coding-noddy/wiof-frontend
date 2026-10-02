import {
  HostListener,
  Component,
  Input,
  OnInit,
  AfterViewInit
} from '@angular/core';
import { VIDEO_SLIDER_OPTIONS } from 'src/app/app.constants';
import { Video } from 'src/app/models/Video';

// Element pages only ever need a taste of recent content, not the full
// catalogue — "Explore More Videos" is the actual path to everything else,
// so the slider itself stays capped at the 10 most recent regardless of
// how many videos the element playlist actually has.
const SLIDER_ITEM_LIMIT = 10;

@Component({
  selector: 'app-video-slider',
  templateUrl: './video-slider.component.html',
  styleUrls: ['./video-slider.component.scss']
})
export class VideoSliderComponent implements OnInit, AfterViewInit {
  @Input() videoList: Array<Video>;
  @Input() element: string;
  videoSliderClass: string;
  width: number;
  slideOpts = VIDEO_SLIDER_OPTIONS;

  get displayList(): Array<Video> {
    return (this.videoList || []).slice(0, SLIDER_ITEM_LIMIT);
  }

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
    const count = this.displayList.length;
    if (this.width >= 1024) {
      // slidesPerView: 4
      return count >= 5;
    } else if (this.width < 1024 && this.width >= 767) {
      // slidesPerView: 3
      return count >= 4;
    } else if (this.width < 767 && this.width >= 480) {
      // slidesPerView: 2
      return count >= 3;
    } else if (this.width < 480) {
      // slidesPerView: 1
      return count >= 2;
    }
  }
}
