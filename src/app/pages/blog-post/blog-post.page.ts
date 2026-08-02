import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { Blog } from 'src/app/models/Blog';
import { BlogService } from 'src/app/services/blog.service';

@Component({
  selector: 'app-blog-post',
  templateUrl: './blog-post.page.html',
  styleUrls: ['./blog-post.page.scss']
})
export class BlogPostPage implements OnInit {
  public blogDetails: Observable<Blog>;
  constructor(
    private route: ActivatedRoute,
    private blogService: BlogService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      if (params.has('blogId')) {
        const blogParam = params.get('blogId');
        // If it looks like a Firebase ID (alphanumeric, 20+ chars), fetch by ID
        // Otherwise treat as slug
        if (blogParam.length >= 20 && /^[a-zA-Z0-9]+$/.test(blogParam)) {
          this.blogDetails = this.blogService.getBlog(blogParam);
        } else {
          this.blogDetails = this.blogService.getBlogBySlug(blogParam);
        }
      }
    });
  }

  async shareBlog(blog: any) {
    const shareData = {
      title: blog.title,
      text: `${blog.title} — by ${blog.author || 'WIOF'} | World is One Family`,
      url: window.location.href
    };

    if (navigator.share) {
      // Native share (mobile)
      try {
        await navigator.share(shareData);
      } catch (e) {
        // User cancelled or share failed — fallback to copy
        this.copyLink();
      }
    } else {
      // Desktop fallback — copy link
      this.copyLink();
    }
  }

  private copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('Link copied to clipboard!');
    });
  }
}
