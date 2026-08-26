import { HostListener, Component, Input, OnInit } from '@angular/core';
import { BLOG_SLIDER_OPTIONS } from 'src/app/app.constants';
import { Blog } from 'src/app/models/Blog';

@Component({
  selector: 'app-blog-slider',
  templateUrl: './blog-slider.component.html',
  styleUrls: ['./blog-slider.component.scss']
})
export class BlogSliderComponent implements OnInit {
  @Input() blogList: Array<Blog>;
  @Input() element: string;
  blogSliderClass: string;
  slideOpts = BLOG_SLIDER_OPTIONS;
  width: number;
  slidesPerView: number;

  @HostListener('window:resize', [])
  public onResize() {
    this.detectScreenSize();
  }

  ngAfterViewInit() {
    this.detectScreenSize();
  }

  detectScreenSize() {
    this.width = window.innerWidth;
    this.slidesPerView = this.calcSlidesPerView(this.width);
  }

  private calcSlidesPerView(width: number): number {
    if (width >= 1024) {
      return 4;
    } else if (width >= 767) {
      return 3;
    } else if (width >= 480) {
      return 2;
    }
    return 1;
  }

  constructor() {}

  ngOnInit() {
    this.blogSliderClass = `wiof-${this.element}`;
    // compute up-front so the initial slides-per-view attribute is already correct
    this.detectScreenSize();
  }
  showNavigator() {
    if (this.width >= 1024) {
      // slidesPerView: 4
      return this.blogList.length >= 5;
    } else if (this.width < 1024 && this.width >= 767) {
      // slidesPerView: 3
      return this.blogList.length >= 4;
    } else if (this.width < 767 && this.width >= 480) {
      // slidesPerView: 2
      return this.blogList.length >= 3;
    } else if (this.width < 480) {
      // slidesPerView: 1
      return this.blogList.length >= 2;
    }
  }
}
