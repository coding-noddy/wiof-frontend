import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { Blog } from 'src/app/models/Blog';
import { BlogService } from 'src/app/services/blog.service';
import { ActivityService } from 'src/app/services/activity.service';
import { AuthService } from 'src/app/services/auth.service';
import { BlogReadCompleteEvent } from 'src/app/directives/blog-read-tracker.directive';

@Component({
  selector: 'app-blog-post',
  templateUrl: './blog-post.page.html',
  styleUrls: ['./blog-post.page.scss']
})
export class BlogPostPage implements OnInit {
  public blogDetails: Observable<Blog>;
  constructor(
    private route: ActivatedRoute,
    private blogService: BlogService,
    private activityService: ActivityService,
    private authService: AuthService
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

        // Log activity for authenticated users (fire-and-forget)
        this.logBlogRead(blogParam);
      }
    });
  }

  private logBlogRead(contentId: string): void {
    this.authService.isAuthenticated$.pipe(first()).subscribe(isAuth => {
      if (!isAuth) return;
      this.authService.currentUser$.pipe(first()).subscribe(user => {
        if (!user) return;
        this.activityService.logActivity({
          activityType: 'blog_read',
          contentId,
          userId: user.uid
        }).catch(err => console.warn('Blog read activity logging failed:', err));
      });
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

  /**
   * Computes the word count from the blog's content.
   * Strips HTML tags and counts words separated by whitespace.
   * Defaults to 1000 words if content is unavailable.
   */
  getWordCount(blog: Blog): number {
    const htmlContent = blog.content || '';
    if (!htmlContent) {
      return 1000; // Default per design: 5-minute estimated read
    }
    // Strip HTML tags and count words
    const textContent = htmlContent.replace(/<[^>]*>/g, '');
    const words = textContent.split(/\s+/).filter(word => word.length > 0);
    return words.length || 1000;
  }

  /**
   * Handles the qualityReadComplete event from BlogReadTrackerDirective.
   * Logs the blog read completion via ActivityService for authenticated users.
   */
  onReadComplete(event: BlogReadCompleteEvent, blogTitle?: string): void {
    this.authService.currentUser$.pipe(first()).subscribe(user => {
      if (!user) return;
      this.activityService.logBlogReadComplete(
        user.uid,
        event.contentId,
        event.scrollDepth,
        event.timeSpent,
        blogTitle
      ).catch(err => console.warn('Blog read complete logging failed:', err));
    });
  }

  private copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('Link copied to clipboard!');
    });
  }
}
