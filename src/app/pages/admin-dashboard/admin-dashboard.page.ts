import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BlogService } from '../../services/blog.service';
import { NewsService } from '../../services/news.service';
import { PollQuestionService } from '../../services/poll-question.service';
import { SubscriptionService } from '../../services/subscription.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss']
})
export class AdminDashboardPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<boolean>();
  sidebarCollapsed = false;
  isMobile = false;
  isDarkTheme = false;

  navItems = [
    {
      name: 'Blogs',
      route: 'manage-blog',
      icon: 'document-text-outline',
      color: 'linear-gradient(135deg, #667eea, #764ba2)',
      description: 'Create and manage blog posts'
    },
    {
      name: 'Polls',
      route: 'manage-polls',
      icon: 'bar-chart-outline',
      color: 'linear-gradient(135deg, #f093fb, #f5576c)',
      description: 'Manage polls and surveys'
    },
    {
      name: 'Breaking News',
      route: 'manage-news',
      icon: 'newspaper-outline',
      color: 'linear-gradient(135deg, #4facfe, #00f2fe)',
      description: 'Publish breaking news items'
    },
    {
      name: 'Calendar',
      route: 'manage-calendar',
      icon: 'calendar-outline',
      color: 'linear-gradient(135deg, #43e97b, #38f9d7)',
      description: 'Environment calendar events'
    },
    {
      name: 'Coffee Conversations',
      route: 'manage-coffee-conversation',
      icon: 'cafe-outline',
      color: 'linear-gradient(135deg, #fa709a, #fee140)',
      description: 'Manage video conversations'
    },
    {
      name: 'In Focus',
      route: 'manage-in-focus',
      icon: 'eye-outline',
      color: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
      description: 'Featured content spotlight'
    },
    {
      name: 'Firm In Focus',
      route: 'manage-ngo-in-focus',
      icon: 'business-outline',
      color: 'linear-gradient(135deg, #ffecd2, #fcb69f)',
      description: 'Manage featured organizations'
    },
    {
      name: 'Courses',
      route: 'manage-course-in-focus',
      icon: 'school-outline',
      color: 'linear-gradient(135deg, #89f7fe, #66a6ff)',
      description: 'Featured courses and programs'
    },
    {
      name: 'Team Profiles',
      route: 'manage-about-us',
      icon: 'people-outline',
      color: 'linear-gradient(135deg, #c3cfe2, #f5f7fa)',
      description: 'Manage team member profiles'
    },
    {
      name: 'Subscribers',
      route: 'subscribers',
      icon: 'mail-outline',
      color: 'linear-gradient(135deg, #fdfcfb, #e2d1c3)',
      description: 'View and export subscriber list'
    }
  ];

  stats = [
    { label: 'Blogs', value: '—', icon: 'document-text-outline', bgColor: 'linear-gradient(135deg, #667eea, #764ba2)' },
    { label: 'News', value: '—', icon: 'newspaper-outline', bgColor: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
    { label: 'Subscribers', value: '—', icon: 'mail-outline', bgColor: 'linear-gradient(135deg, #43e97b, #38f9d7)' },
    { label: 'Polls', value: '—', icon: 'bar-chart-outline', bgColor: 'linear-gradient(135deg, #f093fb, #f5576c)' }
  ];

  constructor(
    private afAuthService: AuthService,
    private router: Router,
    private blogService: BlogService,
    private newsService: NewsService,
    private pollService: PollQuestionService,
    private subscriptionService: SubscriptionService
  ) {}

  ngOnInit() {
    this.checkScreenSize();
    this.loadTheme();
    this.loadStats();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.sidebarCollapsed = true;
    }
  }

  private loadStats() {
    this.blogService.getBlogs().pipe(takeUntil(this.destroy$)).subscribe(blogs => {
      this.stats[0].value = blogs.length.toString();
    });

    this.newsService.getAllNews().pipe(takeUntil(this.destroy$)).subscribe(news => {
      this.stats[1].value = news.length.toString();
    });

    this.subscriptionService.getSubscribers().pipe(takeUntil(this.destroy$)).subscribe(subs => {
      // Deduplicate by email like subscribers page does
      const uniqueEmails = new Set();
      const unique = subs.filter(s => {
        if (!uniqueEmails.has(s.email)) {
          uniqueEmails.add(s.email);
          return true;
        }
        return false;
      });
      this.stats[2].value = unique.length.toString();
    });

    this.pollService.getPollQuestions().pipe(takeUntil(this.destroy$)).subscribe(polls => {
      this.stats[3].value = polls.length.toString();
    });
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('admin-theme', this.isDarkTheme ? 'dark' : 'light');
    this.applyTheme();
  }

  private loadTheme() {
    const saved = localStorage.getItem('admin-theme');
    this.isDarkTheme = saved === 'dark';
    this.applyTheme();
  }

  private applyTheme() {
    if (this.isDarkTheme) {
      document.body.classList.add('admin-dark-theme');
    } else {
      document.body.classList.remove('admin-dark-theme');
    }
    // Also apply to the admin layout element if present
    const el = document.querySelector('.admin-layout');
    if (el) {
      el.classList.toggle('dark-theme', this.isDarkTheme);
    }
  }

  onLogout() {
    this.afAuthService.logout();
    this.router.navigate(['/login']);
  }
}
