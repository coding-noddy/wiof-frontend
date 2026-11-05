import { Component, OnInit, Input } from '@angular/core';
import { Blog } from 'src/app/models/Blog';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { shareLink } from 'src/app/util/share-link';

@Component({
    selector: 'app-blog-card',
    templateUrl: './blog-card.component.html',
    styleUrls: ['./blog-card.component.scss'],
    standalone: false
})
export class BlogCardComponent implements OnInit {
  @Input() blog: Blog;
  @Input() element: string;
  /**
   * Heading level of the title for screen readers, when the card sits under
   * a heading deeper than the page's own (e.g. 4 inside Explore next's groups).
   */
  @Input() headingLevel: number | null = null;

  constructor(private uiUtil: UiUtilService) {}

  ngOnInit() {}

  /**
   * A full link when the element is known, so the card also works on pages
   * outside the element's own routes (e.g. Explore next on a blog page,
   * where a relative 'blog/…' would nest under the current post).
   */
  get link(): string[] {
    const id = this.blog.slug || this.blog.id;
    return this.element ? ['/element', this.element, 'blog', id] : ['blog', id];
  }

  async shareBlog(event: Event) {
    event.stopPropagation(); // prevent card navigation
    event.preventDefault();

    const url = `${window.location.origin}/element/${this.element}/blog/${this.blog.slug || this.blog.id}`;
    const shareData = {
      title: this.blog.title,
      text: `${this.blog.title} — by ${this.blog.author || 'WIOF'} | World is One Family`,
      url
    };

    await shareLink(shareData, this.uiUtil);
  }
}
