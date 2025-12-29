import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardPage } from './admin-dashboard.page';

const routes: Routes = [
  {
    path: '',
    component: AdminDashboardPage
  },
  {
    path: 'manage-polls',
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./poll/manage-polls/manage-polls.module').then(
            (m) => m.ManagePollsPageModule
          )
      },
      {
        path: 'poll/:mode',
        loadChildren: () =>
          import('./poll/add-poll/add-poll.module').then(
            (m) => m.AddPollPageModule
          )
      }
    ]
  },
  {
    path: 'manage-news',
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./news/manage-news/manage-news.module').then(
            (m) => m.ManageNewsPageModule
          )
      },
      {
        path: 'news/:mode',
        loadChildren: () =>
          import('./news/add-news/add-news.module').then(
            (m) => m.AddNewsPageModule
          )
      }
    ]
  },
  {
    path: 'manage-calendar',
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./calendar/manage-calendar/manage-calendar.module').then(
            (m) => m.ManageCalendarPageModule
          )
      },
      {
        path: 'occasion/:mode',
        loadChildren: () =>
          import('./calendar/add-occasion/add-occasion.module').then(
            (m) => m.AddOccasionPageModule
          )
      }
    ]
  },
  {
    path: 'manage-coffee-conversation',
    children: [
      {
        path: '',
        loadChildren: () =>
          import(
            './coffee-conversation/manage-coffee-conversation/manage-coffee-conversation.module'
          ).then((m) => m.ManageCoffeeConversationPageModule)
      },
      {
        path: 'coffee-conversation/:mode',
        loadChildren: () =>
          import(
            './coffee-conversation/add-coffee-conversation/add-coffee-conversation.module'
          ).then((m) => m.AddCoffeeConversationPageModule)
      }
    ]
  },
  {
    path: 'manage-blog',
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./blog/manage-blog/manage-blog.module').then(
            (m) => m.ManageBlogPageModule
          )
      },
      {
        path: 'blog/:mode',
        loadChildren: () =>
          import('./blog/add-blog/add-blog.module').then(
            (m) => m.AddBlogPageModule
          )
      }
    ]
  },
  {
    path: 'manage-in-focus',
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./in-focus/manage-in-focus/manage-in-focus.module').then(
            (m) => m.ManageInFocusPageModule
          )
      },
      {
        path: 'in-focus/:mode',
        loadChildren: () =>
          import('./in-focus/add-in-focus/add-in-focus.module').then(
            (m) => m.AddInFocusPageModule
          )
      }
    ]
  },
  {
    path: 'manage-course-in-focus',
    children: [
      {
        path: '',
        loadChildren: () =>
          import(
            './course-in-focus/manage-course-in-focus/manage-course-in-focus.module'
          ).then((m) => m.ManageCourseInFocusPageModule)
      },
      {
        path: 'course-in-focus/:mode',
        loadChildren: () =>
          import(
            './course-in-focus/add-course-in-focus/add-course-in-focus.module'
          ).then((m) => m.AddCourseInFocusPageModule)
      }
    ]
  },
  {
    path: 'manage-ngo-in-focus',
    children: [
      {
        path: '',
        loadChildren: () =>
          import(
            './ngo-in-focus/manage-ngo-in-focus/manage-ngo-in-focus.module'
          ).then((m) => m.ManageNgoInFocusPageModule)
      },
      {
        path: 'ngo-in-focus/:mode',
        loadChildren: () =>
          import(
            './ngo-in-focus/add-ngo-in-focus/add-ngo-in-focus.module'
          ).then((m) => m.AddNgoInFocusPageModule)
      }
    ]
  },
  {
    path:'manage-about-us',
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./about-us/manage-about-us/manage-about-us.module').then(
            (m) => m.ManageAboutUsPageModule
          )
      },
      {
        path: 'about-us/:mode',
        loadChildren: () =>
          import('./about-us/add-about-us/add-about-us.module').then(
            (m) => m.AddAboutUsPageModule
          )
      }
    ] 
  },
  {
    path: 'subscribers',
    loadChildren: () =>
      import('./subscribers/subscribers.module').then(
        (m) => m.SubscribersPageModule
      )
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminDashboardPageRoutingModule {}
