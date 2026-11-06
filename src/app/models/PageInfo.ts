/**
 * What page a URL is, for the browser title and Google Analytics (8.9.0).
 * One place maps every route to a page group (GA4's content_group), its
 * element and a readable title, so GA's page reports show "Rainwater
 * Harvesting · Water" instead of one "World Is One Family" row.
 */
export const SITE_NAME = 'World Is One Family';

const ELEMENT_NAMES: Record<string, string> = { air: 'Air', water: 'Water', earth: 'Earth', energy: 'Energy', spirit: 'Spirit' };

export type PageGroup =
  | 'home' | 'element' | 'stories' | 'story' | 'videos' | 'video' | 'conversation' | 'take_action'
  | 'my_journey' | 'my_library' | 'my_feedback' | 'settings' | 'about' | 'legal'
  | 'login' | 'admin' | 'not_found';

export interface PageInfo {
  group: PageGroup;
  element: string | null;
  /** The page's own title, without the site name. */
  title: string;
  /** Story and video pages: wait for the content's own title before reporting the view. */
  waitsForContent: boolean;
  /** The path without query or fragment, e.g. "/element/water/blog/rainwater". */
  path: string;
}

const SIMPLE: Record<string, [PageGroup, string]> = {
  'home': ['home', 'Home'],
  'take-action': ['take_action', 'Take Action'],
  'my-journey': ['my_journey', 'My Journey'],
  'my-library': ['my_library', 'My Library'],
  'my-saved': ['my_library', 'My Library'],
  'my-feedback': ['my_feedback', 'My Feedback'],
  'settings': ['settings', 'Settings'],
  'our-purpose': ['about', 'Our Purpose'],
  'our-team': ['about', 'Our Team'],
  'aboutus': ['about', 'About Us'],
  'discover-more': ['about', 'Discover More'],
  'climatenlighten': ['about', 'ClimatEnlighten'],
  'privacy-policy': ['legal', 'Privacy Policy'],
  'copyright': ['legal', 'Copyright'],
  'sitemap': ['legal', 'Sitemap'],
  'login': ['login', 'Sign in']
};

/** "Admin · Manage blogs" from "/admin-dashboard/manage-blogs". */
function adminTitle(segments: string[]): string {
  const page = segments[1];
  return page ? `Admin · ${page.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())}` : 'Admin';
}

const decodeSegment = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

export function pageInfo(url: string): PageInfo {
  const path = '/' + (url || '').split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
  const segments = path.split('/').filter(Boolean).map(decodeSegment);
  const info = (group: PageGroup, title: string, element: string | null = null, waitsForContent = false): PageInfo =>
    ({ group, element, title, waitsForContent, path: path === '/' ? '/home' : path });

  if (!segments.length) return info('home', 'Home');
  const [first, second, third] = segments;
  if (SIMPLE[first]) return info(SIMPLE[first][0], SIMPLE[first][1]);
  if (first === 'admin-dashboard') return info('admin', adminTitle(segments));

  if (first === 'element' && ELEMENT_NAMES[second]) {
    const name = ELEMENT_NAMES[second];
    if (!third) return info('element', name, second);
    if (third === 'blogs') return info('stories', `${name} stories`, second);
    if (third === 'videos') return info('videos', `${name} videos`, second);
    if (third === 'take-action') return info('take_action', `${name} · Take Action`, second);
    if (third === 'blog' && segments[3]) return info('story', `Story · ${name}`, second, true);
    if (third === 'video' && segments[3]) return info('video', `Video · ${name}`, second, true);
    // The element pages' own sections (EQ, widgets…) count as the element page.
    return info('element', name, second);
  }
  // A Coffee Conversation's own page (8.12.0); its topic arrives with the data.
  if (first === 'conversation' && second) return info('conversation', 'Coffee Conversation', null, true);
  return info('not_found', 'Page not found');
}

/** The browser title: "Rainwater Harvesting · Water · World Is One Family"; the home page is just the site name. */
export function documentTitle(page: PageInfo, contentTitle?: string | null): string {
  if (page.group === 'home') return SITE_NAME;
  const name = contentTitle?.trim() && page.waitsForContent
    ? `${contentTitle.trim()} · ${ELEMENT_NAMES[page.element || ''] || ''}`.replace(/ · $/, '')
    : page.title;
  return `${name} · ${SITE_NAME}`;
}
