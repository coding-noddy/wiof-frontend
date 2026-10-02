export const POLL_STATUS = {
  SUBMITTED: 'submitted',
  PUBLISHED: 'published',
  INACTIVE: 'inactive'
};

export const ELEMENT_VIDEOS_PLAYLIST_ID = {
  AIR: 'PLitAAO2FhPTECrRbhFyIllj6TSobTGiJI',
  WATER: 'PLitAAO2FhPTHZRcarOENNjYcdPlzwpZEn',
  EARTH: 'PLitAAO2FhPTHdtNVNkcm3JIX6jmhPZjyN',
  ENERGY: 'PLitAAO2FhPTFw5EoLsuua6Ang60PGBH0d',
  SPIRIT: 'PLitAAO2FhPTFjxy3EsgDR_XPtgiX8Ez-q',

  air: 'PLitAAO2FhPTECrRbhFyIllj6TSobTGiJI',
  water: 'PLitAAO2FhPTHZRcarOENNjYcdPlzwpZEn',
  earth: 'PLitAAO2FhPTHdtNVNkcm3JIX6jmhPZjyN',
  energy: 'PLitAAO2FhPTFw5EoLsuua6Ang60PGBH0d',
  spirit: 'PLitAAO2FhPTFjxy3EsgDR_XPtgiX8Ez-q'
};

export const ELEMENTS = {
  EARTH: 'earth',
  ENERGY: 'energy',
  AIR: 'air',
  WATER: 'water',
  SPIRIT: 'spirit'
};

export const ELEMENT_BLOG_CATEGORY = {
  AIR: 'Air',
  WATER: 'Water',
  EARTH: 'Earth',
  ENERGY: 'Energy',
  SPIRIT: 'Spirit'
};

export const ELEMENT_SELECT = {
  AIR: 'air',
  WATER: 'water',
  EARTH: 'earth',
  ENERGY: 'energy',
  SPIRIT: 'spirit',
  CONFIG: 'config'
};

export const AQI_WIDGET_LOCATIONS = {
  DELHI: 'delhi',
  MUMBAI: 'mumbai',
  KOLKATA: 'kolkata',
  CHENNAI: 'chennai',
  BANGALORE: 'bangalore'
};

export const VIDEO_SLIDER_OPTIONS = {
  slidesPerView: 4,
  freeMode: true,
  coverflowEffect: {
    rotate: 50,
    stretch: 0,
    depth: 100,
    modifier: 1,
    slideShadows: true
  },

  // navigation: {
  //   nextEl: '.swiper-button-next',
  //   prevEl: '.swiper-button-prev',
  // },

  // Responsive breakpoints
  breakpoints: {
    // when window width is >= 320px
    0: {
      slidesPerView: 1
    },
    // when window width is >= 480px
    480: {
      slidesPerView: 2
    },
    // when window width is >= 767px
    767: {
      slidesPerView: 3
    },
    // when window width is >= 1024px
    1024: {
      slidesPerView: 4
    }
  }
};

export const BREAKING_NEWS_SLIDER_OPTIONS = {
  slidesPerView: 1,
  spaceBetween: 1,
  freeMode: false,
  autoplay: {
    delay: 5000,
    pauseOnMouseEnter: true
  }
};

export const COFFEE_CONV_SLIDER_OPTIONS = {
  slidesPerView: 1,
  spaceBetween: 1,
  freeMode: false
};

export const BLOG_SLIDER_OPTIONS = {
  slidesPerView: 4,
  spaceBetween: 10,
  freeMode: true,
  coverflowEffect: {
    rotate: 50,
    stretch: 0,
    depth: 100,
    modifier: 1,
    slideShadows: true
  },

  // Responsive breakpoints
  breakpoints: {
    // when window width is >= 320px
    0: {
      slidesPerView: 1
    },
    // when window width is >= 480px
    480: {
      slidesPerView: 2
    },
    // when window width is >= 767px
    767: {
      slidesPerView: 3
    },
    // when window width is >= 1024px
    1024: {
      slidesPerView: 4
    }
  }
};

export const ENDPOINTS = {
  YOUTUBE: {
    VIDEO: 'https://www.googleapis.com/youtube/v3/videos',
    PLAYLIST: 'https://www.googleapis.com/youtube/v3/playlistItems'
  },
  AQI_WIDGET: 'https://api.waqi.info',
  OPEN_METEO: 'https://api.open-meteo.com/v1/forecast'
};

export const INDIAN_CITIES = [
  { name: 'Mumbai',    lat: 19.076,  lon: 72.877 },
  { name: 'Delhi',     lat: 28.644,  lon: 77.216 },
  { name: 'Bangalore', lat: 12.972,  lon: 77.594 },
  { name: 'Chennai',   lat: 13.083,  lon: 80.270 },
  { name: 'Kolkata',   lat: 22.572,  lon: 88.363 },
  { name: 'Hyderabad', lat: 17.385,  lon: 78.486 },
  { name: 'Pune',      lat: 18.520,  lon: 73.856 },
  { name: 'Ahmedabad', lat: 23.023,  lon: 72.572 },
  { name: 'Jaipur',    lat: 26.912,  lon: 75.787 },
  { name: 'Lucknow',   lat: 26.847,  lon: 80.947 },
  { name: 'Bhopal',    lat: 23.259,  lon: 77.413 },
  { name: 'Bhubaneswar', lat: 20.296, lon: 85.824 },
];

export const FIREBASE_COLLECTION = {
  BLOGS: 'Blogs',
  SUBSCRIPTIONS: 'Subscriptions',
  BLOG_IMAGE_STORAGE: 'blog-images',
  ENVCAL_IMAGE_STORAGE: 'environment-calendar',
  NEWS_IMAGE_STORAGE: 'news-images',
  COURSE_IN_FOCUS_IMAGE_STORAGE: 'course-in-focus-images',
  NGO_IN_FOCUS_IMAGE_STORAGE: 'ngo-in-focus-images',
  POLLS: 'Polls',
  POLL: 'Poll',
  ENVCAL: 'Envcal',
  NEWS: 'News',
  CONFIG: 'config',
  COFFEE_CONVERSATIONS: 'CoffeeConversations',
  IN_FOCUS: 'InFocus',
  NGO_IN_FOCUS: 'NGOinFocus',
  COURSE_IN_FOCUS: 'CourseInFocus',
  USERS: 'users',
  ADMINS: 'admins',
  ACTIVITY_LOG: 'activity_log',
  USER_SAVED_CONTENT: 'user_saved_content',
  POLL_RESULTS: 'poll_results',
  USER_METRICS: 'user_metrics',
  ACTIONS: 'actions',
  USER_ACTIONS: 'user_actions',
  USER_ACTION_COMPLETIONS: 'user_action_completions',
  HERO_VIDEOS: 'hero_videos'
};

export const ACTION_TYPE = {
  PERSONAL: 'PERSONAL',
  NATURE: 'NATURE',
  COMMUNITY: 'COMMUNITY',
  EVENT: 'EVENT'
};

export const COMPLETION_TYPE = {
  SELF_REPORTED: 'SELF_REPORTED'
};

export const REPEAT_TYPE = {
  ONCE: 'ONCE',
  DAILY: 'DAILY',
  // No per-period dedup guard (unlike DAILY) — the user can mark these done
  // again any time. OCCASIONAL is the same mechanic as REPEATABLE; it exists
  // as a separate value only to convey a lighter expected cadence to the
  // user, not a different completion rule.
  REPEATABLE: 'REPEATABLE',
  OCCASIONAL: 'OCCASIONAL'
};

export const ACTION_DIFFICULTY = {
  VERY_EASY: 'VERY_EASY',
  EASY: 'EASY',
  MODERATE: 'MODERATE'
};

export const EVIDENCE_LEVEL = {
  OFFICIAL_SUPPORT: 'OFFICIAL_SUPPORT',
  WIDELY_ACCEPTED: 'WIDELY_ACCEPTED',
  WIOF_CURATED: 'WIOF_CURATED'
};

export const USER_ACTION_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE'
};

// Built-in defaults for the hero video widget (VideoWidgetComponent). The
// live values are admin-managed in the `hero_videos` collection (Admin ->
// Hero Videos); these are only the fallback for when a slot's doc is
// missing or the read fails, and the source scripts/seed-hero-videos.js
// copied from. Keys are the widget's `element` input, uppercased; CONFIG
// is the Our Purpose page.
export const VIDEO_PLAYER_TITLES = {
  AIR: 'The Current Deadly Killer in the Air',
  WATER: 'Water : The most precious resource',
  EARTH: 'Rediscover our Planet Earth',
  ENERGY: 'The Rise of Solar and Wind Energy',
  SPIRIT: 'Handling Depression with Self Love',
  CONFIG: 'About WorldIsOneFamily.com'
};

export const VIDEO_PLAYER_VIDEOS = {
  AIR: 'Xs70ewSdEjE',
  WATER: 'RkdIIfArWqo',
  EARTH: 'ghkQoJoipbM',
  ENERGY: 'mmyrbKBZ6SU',
  SPIRIT: 'CEqoCcacR3Y',
  CONFIG: 'SYWb9hNX-1s'
};

/**
 * The fixed set of hero video slots, one Firestore doc each in
 * `hero_videos`, keyed by `id`. `widgetKey` is the VideoWidgetComponent
 * `element` input that renders the slot (Our Purpose passes 'config').
 * firestore.rules allow-lists these same ids.
 */
export const HERO_VIDEO_SLOTS = [
  { id: 'air', widgetKey: 'air', label: 'Air', location: 'Air element page' },
  { id: 'water', widgetKey: 'water', label: 'Water', location: 'Water element page' },
  { id: 'earth', widgetKey: 'earth', label: 'Earth', location: 'Earth element page' },
  { id: 'energy', widgetKey: 'energy', label: 'Energy', location: 'Energy element page' },
  { id: 'spirit', widgetKey: 'spirit', label: 'Spirit', location: 'Spirit element page' },
  { id: 'our-purpose', widgetKey: 'config', label: 'Our Purpose', location: 'Our Purpose page' }
];

// TODO try to find another way
export const PAGE_CATEGORY_MAP = {
  air: 'Air',
  water: 'Water',
  earth: 'Earth',
  energy: 'Energy',
  spirit: 'Spirit'
};

/**
 * Normalizes a stored category/element value for lowercase comparison,
 * mapping the legacy 'fire' identifier (used before the Energy rename) to
 * 'energy'. Content created before the rename may still have 'Fire' stored
 * as its category — apply this to any such value read from Firestore
 * before comparing it against 'energy'/ELEMENT_SELECT.ENERGY, rather than
 * requiring a data migration.
 */
export function normalizeElementCategory(value: string | null | undefined): string {
  const normalized = (value || '').toLowerCase();
  return normalized === 'fire' ? ELEMENTS.ENERGY : normalized;
}

export const ITEM_STATUS = {
  SUBMITTED: 'submitted',
  PUBLISHED: 'published',
  INACTIVE: 'inactive'
};

export const MEDIA_TYPE = {
  IMAGE: 'image',
  VIDEO: 'video'
};

export const Routes = {
  NEWS: {
    MANAGE: '/admin-dashboard/manage-news',
    ADD: '/admin-dashboard/add',
    EDIT: '/admin-dashboard/edit'
  }
};

export const Months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export const YOUTUBE_EMBED_VIDEO_LINK =
  'https://www.youtube.com/embed/VIDEO_ID?enablejsapi=1&version=3&playerapiid=ytplayer?controls=1';

export const ITEMS = {
  BLOG: 'Blog',
  POLL_QUESTION: 'Poll question',
  OCCASION: 'Occasion',
  COFFEE_CONVERSATION: 'Coffee conversastion',
  IN_FOCUS: 'In Focus',
  NEWS: 'News',
  COURSE_IN_FOCUS: 'Course in focus',
  NGO_IN_FOCUS: 'NGO in focus',
  ABOUT_US:'About us Profile',
  TAKE_ACTION: 'Action'
};

export const UI_MESSAGES = {
  PLACEHOLDER: '$ITEM',
  SUCCESS_HEADER: 'Success',
  SUCCESS_ADD_ITEM_DESC: '$ITEM saved successfully!',
  SUCCESS_DELETE_ITEM_DESC: '$ITEM deleted successfully!',
  SUCCESS_CTA_TEXT: 'OK',
  FAILURE_HEADER: 'Error',
  FAILURE_ADD_ITEM_DESC: 'Uh oh! Failed to save $ITEM. Please try again.',
  FAILURE_DELETE_ITEM_DESC: 'Uh Oh! Failed to delete $ITEM. Please try again.',
  FAILURE_CTA_TEXT: 'OK',
  SUCCESS_SUBSCRIPTION:
    'You are now subscribed to WIOF Newsletter. Stay tuned for receiving periodic updates of our website in your mailbox.',
  ALREADY_SUBSCRIBED:
    'You have already been subscribed to WIOF Newsletter. Stay tuned for receiving periodic updates of our website in your mailbox.',
  SUCCESS_PUBLISH_ITEM_DESC: '$ITEM successfully published!',
  SUCCESS_UNPUBLISH_ITEM_DESC: '$ITEM successfully unpublished!',
  SUCCESS_POLL_VOTE_HEADER: 'Vote Recorded',
  SUCCESS_POLL_VOTE_DESC:
    'Your vote has been recorded. Thanks for voting!',
  CONFIRM_HEADER: 'Confirm',
  CONFIRM_DELETE_ITEM_DESC: 'Are you sure you want to delete this $ITEM?',
  CONFIRM_DELETE_PRIMARY_CTA: 'Yes',
  CONFIRM_DELETE_SECONDARY_CTA: 'No',
  SAVE_IN_PROGRESS: 'Saving $ITEM...',
  DELETE_IN_PROGRESS: 'Deleting $ITEM...',
  CONFIRM_DEACTIVATE_ITEM_DESC: 'Are you sure you want to deactivate this $ITEM? It will no longer be shown to users, but existing history referencing it is preserved.',
  CONFIRM_DEACTIVATE_PRIMARY_CTA: 'Yes',
  CONFIRM_DEACTIVATE_SECONDARY_CTA: 'No',
  DEACTIVATE_IN_PROGRESS: 'Deactivating $ITEM...',
  SUCCESS_DEACTIVATE_ITEM_DESC: '$ITEM deactivated successfully!',
  FAILURE_DEACTIVATE_ITEM_DESC: 'Uh oh! Failed to deactivate $ITEM. Please try again.'
};

export const AVG_WORD_READ_PER_MIN = 250;

export const IN_FOCUS_TITLE = {
  [ELEMENT_SELECT.EARTH]: 'Animal Rescue in Focus',
  [ELEMENT_SELECT.AIR]: 'City in Focus',
  [ELEMENT_SELECT.ENERGY]: 'Innovation in Focus',
  [ELEMENT_SELECT.WATER]: 'River in Focus',
  [ELEMENT_SELECT.SPIRIT]: 'Asana in Focus'
};
