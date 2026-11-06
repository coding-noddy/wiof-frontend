import { NgModule, inject } from '@angular/core';
import { Router, RouterModule, Routes, UrlMatcher } from '@angular/router';

import { AuthGuard } from './guards/auth.guard';
import { PublicUserGuard } from './guards/public-user.guard';

const ELEMENTS = ['earth', 'water', 'air', 'energy', 'spirit'];

/**
 * Matches /element/<one of the five elements>/<section>/..., consuming the
 * first three segments (the rest goes to the lazy module) and exposing
 * :element. Anything else, e.g. an unknown element, still falls through to
 * the not-found page.
 */
function elementSection(section: string): UrlMatcher {
  return (segments) =>
    segments.length >= 3 &&
    segments[0].path === 'element' &&
    ELEMENTS.includes(segments[1].path) &&
    segments[2].path === section
      ? { consumed: segments.slice(0, 3), posParams: { element: segments[1] } }
      : null;
}

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
  // Element detail pages. Registered here, not as children of each element
  // page's routes, so opening one (often a visitor's landing page from a
  // shared link) doesn't load the element page's module and its sliders.
  // The URLs are unchanged.
  {
    matcher: elementSection('blog'),
    loadChildren: () =>
      import('./pages/blog-post/blog-post.module').then((m) => m.BlogPostPageModule)
  },
  {
    matcher: elementSection('video'),
    loadChildren: () =>
      import('./pages/video-post/video-post.module').then((m) => m.VideoPostPageModule)
  },
  {
    matcher: elementSection('take-action'),
    loadChildren: () =>
      import('./pages/take-action/take-action.module').then((m) => m.TakeActionPageModule)
  },
  {
    // Old EQ links (before 8.9.1) pointed here; the EQ check is on the Spirit page.
    path: 'element/water/eq-assessment',
    redirectTo: () => inject(Router).parseUrl('/element/spirit#eq-assessment'),
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
    path: 'our-purpose',
    loadChildren: () =>
      import('./pages/our-purpose/our-purpose.module').then(
        (m) => m.OurPurposePageModule
      )
  },
  {
    // Old URL — keep resolving for anyone with it bookmarked or indexed.
    path: 'discover-more',
    redirectTo: 'our-purpose',
    pathMatch: 'full'
  },
  {
    // A Coffee Conversation's own page (8.12.0): save and share it.
    path: 'conversation',
    loadChildren: () =>
      import('./pages/conversation/conversation.module').then((m) => m.ConversationPageModule)
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
    path: 'our-team',
    loadChildren: () =>
      import('./pages/our-team/our-team.module').then((m) => m.OurTeamPageModule)
  },
  {
    // Old URL — keep resolving for anyone with it bookmarked or indexed.
    path: 'aboutus',
    redirectTo: 'our-team',
    pathMatch: 'full'
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
    path: 'my-library',
    loadChildren: () =>
      import('./pages/my-library/my-library.module').then(
        (m) => m.MyLibraryPageModule
      ),
    canActivate: [PublicUserGuard]
  },
  {
    path: 'my-feedback',
    loadChildren: () =>
      import('./pages/my-feedback/my-feedback.module').then(
        (m) => m.MyFeedbackPageModule
      ),
    canActivate: [PublicUserGuard]
  },
  {
    // Kept for bookmarks/old links/SEO, same pattern as the aboutus/discover-more
    // redirects from the our-team/our-purpose rename.
    path: 'my-saved',
    redirectTo: 'my-library',
    pathMatch: 'full'
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
    // Standalone entry point for the Take Action hub (Featured / Browse by
    // Element / Browse by Category / Recently Completed) — the page itself
    // is shared with the element-nested element/:element/take-action routes
    // below; this just gives it a real top-level, element-agnostic URL to
    // link to (nav, home CTA, etc.) without requiring an element context.
    path: 'take-action',
    loadChildren: () =>
      import('./pages/take-action/take-action.module').then(
        (m) => m.TakeActionPageModule
      )
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
  imports: [RouterModule.forRoot(routes, { anchorScrolling: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}

// RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
