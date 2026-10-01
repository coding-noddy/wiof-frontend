import { HostListener, Component, Input, OnInit } from '@angular/core';
import { BLOG_SLIDER_OPTIONS } from 'src/app/app.constants';
import { Blog } from 'src/app/models/Blog';

// Element pages only ever need a taste of recent content, not the full
// catalogue — "Explore More Blogs" is the actual path to everything else,
// so the slider itself stays capped at the 10 most recent regardless of
// how many blogs the element category actually has.
const SLIDER_ITEM_LIMIT = 10;

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

  get displayList(): Array<Blog> {
    return (this.blogList || []).slice(0, SLIDER_ITEM_LIMIT);
  }

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

  constructor() {}

  ngOnInit() {
    this.blogSliderClass = `wiof-${this.element}`;
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
