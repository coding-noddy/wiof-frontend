import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './guards/auth.guard';
import { ElementPage } from './pages/element/element.page';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () =>
      import('./pages/home/home.module').then((m) => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: ':element/blogs/blog',
    redirectTo: ':element/blog',
    pathMatch: 'prefix'
  },
  {
    path: ':element/blogs/take-action',
    redirectTo: ':element/take-action',
    pathMatch: 'full'
  },
  {
    path: ':element/videos/video',
    redirectTo: ':element/video',
    pathMatch: 'prefix'
  },
  {
    path: ':element/videos/take-action',
    redirectTo: ':element/take-action',
    pathMatch: 'full'
  },
  {
    path: 'admin-dashboard',
    loadChildren: () =>
      import('./pages/admin-dashboard/admin-dashboard.module').then(
        (m) => m.AdminDashboardPageModule
      ),
    canActivate: [AuthGuard]
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./pages/login/login.module').then((m) => m.LoginPageModule)
  },
  {
    path: ':element/blogs',
    loadChildren: () =>
      import('./pages/blogs/blogs.module').then((m) => m.BlogsPageModule)
  },
  {
    path: ':element/videos',
    loadChildren: () =>
      import('./pages/videos/videos.module').then((m) => m.VideosPageModule)
  },
  {
    path: ':element/blog',
    loadChildren: () =>
      import('./pages/blog-post/blog-post.module').then(
        (m) => m.BlogPostPageModule
      )
  },
  {
    path: ':element/video',
    loadChildren: () =>
      import('./pages/video-post/video-post.module').then(
        (m) => m.VideoPostPageModule
      )
  },
  {
    path: ':element/take-action',
    loadChildren: () =>
      import('./pages/take-action/take-action.module').then(
        (m) => m.TakeActionPageModule
      )
  },
  {
    path: 'discover-more',
    loadChildren: () =>
      import('./pages/discover-more/discover-more.module').then(
        (m) => m.DiscoverMorePageModule
      )
  },
  {
    path: 'privacy-policy',
    loadChildren: () =>
      import('./pages/privacy-policy/privacy-policy.module').then(
        (m) => m.PrivacyPolicyPageModule
      )
  },
  {
    path: 'sitemap',
    loadChildren: () =>
      import('./pages/sitemap/sitemap.module').then((m) => m.SitemapPageModule)
  },
  {
    path: 'copyright',
    loadChildren: () =>
      import('./pages/copyright/copyright.module').then(
        (m) => m.CopyrightPageModule
      )
  },
  {
    path: 'aboutus',
    loadChildren: () =>
      import('./pages/aboutus/aboutus.module').then((m) => m.AboutusPageModule)
  },
  {
    path: ':element',
    component: ElementPage
  },
  {
    path: '**',
    loadChildren: () =>
      import('./pages/not-found/not-found.module').then(
        (m) => m.NotFoundPageModule
      )
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}

// RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
