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

  // Gradients cycle through 5 on-brand tonal pairs (Teal/Brown/Marigold and
  // their tints/shades from theme/variables.scss) instead of the previous
  // 16 unrelated rainbow gradients — was purely decorative variety with no
  // connection to the site's actual palette.
  private static readonly GRADIENT_TEAL = 'linear-gradient(135deg, #21999F, #145C5F)';
  private static readonly GRADIENT_BROWN = 'linear-gradient(135deg, #A6875D, #645138)';
  private static readonly GRADIENT_MARIGOLD = 'linear-gradient(135deg, #FFC26F, #CC9B59)';
  private static readonly GRADIENT_TEAL_TINT = 'linear-gradient(135deg, #4DADB2, #21999F)';
  private static readonly GRADIENT_BROWN_TINT = 'linear-gradient(135deg, #CAB79E, #A6875D)';

  navItems = [
    {
      name: 'Blogs',
      route: 'manage-blog',
      icon: 'document-text-outline',
      color: AdminDashboardPage.GRADIENT_TEAL,
      description: 'Create and manage blog posts'
    },
    {
      name: 'Polls',
      route: 'manage-polls',
      icon: 'bar-chart-outline',
      color: AdminDashboardPage.GRADIENT_BROWN,
      description: 'Manage polls and surveys'
    },
    {
      name: 'Breaking News',
      route: 'manage-news',
      icon: 'newspaper-outline',
      color: AdminDashboardPage.GRADIENT_MARIGOLD,
      description: 'Publish breaking news items'
    },
    {
      name: 'Calendar',
      route: 'manage-calendar',
      icon: 'calendar-outline',
      color: AdminDashboardPage.GRADIENT_TEAL_TINT,
      description: 'Environment calendar events'
    },
    {
      name: 'Coffee Conversations',
      route: 'manage-coffee-conversation',
      icon: 'cafe-outline',
      color: AdminDashboardPage.GRADIENT_BROWN_TINT,
      description: 'Manage video conversations'
    },
    {
      name: 'In Focus',
      route: 'manage-in-focus',
      icon: 'eye-outline',
      color: AdminDashboardPage.GRADIENT_TEAL,
      description: 'Featured content spotlight'
    },
    {
      name: 'Firm In Focus',
      route: 'manage-ngo-in-focus',
      icon: 'business-outline',
      color: AdminDashboardPage.GRADIENT_BROWN,
      description: 'Manage featured organizations'
    },
    {
      name: 'Courses',
      route: 'manage-course-in-focus',
      icon: 'school-outline',
      color: AdminDashboardPage.GRADIENT_MARIGOLD,
      description: 'Featured courses and programs'
    },
    {
      name: 'Team Profiles',
      route: 'manage-about-us',
      icon: 'people-outline',
      color: AdminDashboardPage.GRADIENT_TEAL_TINT,
      description: 'Manage team member profiles'
    },
    {
      name: 'Subscribers',
      route: 'subscribers',
      icon: 'mail-outline',
      color: AdminDashboardPage.GRADIENT_BROWN_TINT,
      description: 'View and export subscriber list'
    },
    {
      name: 'Registered Users',
      route: 'users',
      icon: 'people-outline',
      color: AdminDashboardPage.GRADIENT_TEAL,
      description: 'View registered user profiles'
    },
    {
      name: 'Analytics',
      route: 'analytics',
      icon: 'analytics-outline',
      color: AdminDashboardPage.GRADIENT_BROWN,
      description: 'Daily visits and engagement charts'
    }
  ];

  stats = [
    { label: 'Blogs', value: '—', icon: 'document-text-outline', bgColor: AdminDashboardPage.GRADIENT_TEAL },
    { label: 'News', value: '—', icon: 'newspaper-outline', bgColor: AdminDashboardPage.GRADIENT_MARIGOLD },
    { label: 'Subscribers', value: '—', icon: 'mail-outline', bgColor: AdminDashboardPage.GRADIENT_BROWN_TINT },
    { label: 'Polls', value: '—', icon: 'bar-chart-outline', bgColor: AdminDashboardPage.GRADIENT_BROWN }
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

  async onLogout() {
    await this.afAuthService.logout();
  }
}
