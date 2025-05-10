import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss']
})
export class AdminDashboardPage implements OnInit {
  constructor(private afAuthService: AuthService, private router: Router) {}
  adminDB = {
    buttons: [
      {
        name: 'Blogs',
        actionUrl: 'manage-blog'
      },
      {
        name: 'Polls',
        actionUrl: 'manage-polls'
      },
      {
        name: 'Breaking News',
        actionUrl: 'manage-news'
      },
      {
        name: 'Calendar',
        actionUrl: 'manage-calendar'
      },
      {
        name: 'Coffee Conversations',
        actionUrl: 'manage-coffee-conversation'
      },
      {
        name: 'In Focus',
        actionUrl: 'manage-in-focus'
      },
      {
        name: 'NGOs In Focus',
        actionUrl: 'manage-ngo-in-focus'
      },
      {
        name: 'Courses In Focus',
        actionUrl: 'manage-course-in-focus'
      },
      {
        name: 'About Us Profiles',
        actionUrl: 'manage-about-us-profiles'
      },
      {
        name: 'Subscriptions',
        actionUrl: 'subscribers'
      }
    ]
  };

  ngOnInit() {}

  onLogout() {
    this.afAuthService.logout();
    this.router.navigate(['/login']);
  }
}
