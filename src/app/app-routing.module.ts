import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './guards/auth.guard';
import { PublicUserGuard } from './guards/public-user.guard';

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
    path: 'element/:element/blogs/blog',
    redirectTo: 'element/:element/blog',
    pathMatch: 'prefix'
  },
  {
    path: 'element/:element/blogs/take-action',
    redirectTo: 'element/:element/take-action',
    pathMatch: 'full'
  },
  {
    path: 'element/:element/videos/video',
    redirectTo: 'element/:element/video',
    pathMatch: 'prefix'
  },
  {
    path: 'element/:element/videos/take-action',
    redirectTo: 'element/:element/take-action',
    pathMatch: 'full'
  },
  {
    path: 'element/earth',
    loadChildren: () =>
      import('./pages/earth/earth.module').then((m) => m.EarthPageModule)
  },
  {
    path: 'element/water',
    loadChildren: () =>
      import('./pages/water/water.module').then((m) => m.WaterPageModule)
  },
  {
    path: 'element/energy',
    loadChildren: () =>
      import('./pages/energy/energy.module').then((m) => m.EnergyPageModule)
  },
  {
    path: 'element/spirit',
    loadChildren: () =>
      import('./pages/spirit/spirit.module').then((m) => m.SpiritPageModule)
  },
  {
    path: 'element/water',
    loadChildren: () =>
      import('./pages/water/water.module').then((m) => m.WaterPageModule)
  },
  {
    path: 'element/air',
    loadChildren: () =>
      import('./pages/air/air.module').then((m) => m.AirPageModule)
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
    path: 'element/:element/blogs',
    loadChildren: () =>
      import('./pages/blogs/blogs.module').then((m) => m.BlogsPageModule)
  },

  {
    path: 'element/:element/videos',
    loadChildren: () =>
      import('./pages/videos/videos.module').then((m) => m.VideosPageModule)
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
    path: 'climatenlighten',
    loadChildren: () => 
      import('./pages/climate-enlighten/climate-enlighten.module').then(
        (m) => m.ClimateEnlightenPageModule
      )
  },
  {
    path: 'my-journey',
    loadChildren: () =>
      import('./pages/my-journey/my-journey.module').then(
        (m) => m.MyJourneyPageModule
      ),
    canActivate: [PublicUserGuard]
  },
  {
    path: 'my-saved',
    loadChildren: () =>
      import('./pages/my-saved/my-saved.module').then(
        (m) => m.MySavedPageModule
      ),
    canActivate: [PublicUserGuard]
  },
  {
    path: 'settings',
    loadChildren: () =>
      import('./pages/settings/settings.module').then(
        (m) => m.SettingsPageModule
      ),
    canActivate: [PublicUserGuard]
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
