export const POLL_STATUS = {
  SUBMITTED: 'submitted',
  PUBLISHED: 'published',
  INACTIVE: 'inactive'
};

export const ELEMENT_VIDEOS_PLAYLIST_ID = {
  AIR: 'PLitAAO2FhPTECrRbhFyIllj6TSobTGiJI',
  WATER: 'PLitAAO2FhPTHZRcarOENNjYcdPlzwpZEn',
  EARTH: 'PLitAAO2FhPTHdtNVNkcm3JIX6jmhPZjyN',
  FIRE: 'PLitAAO2FhPTFw5EoLsuua6Ang60PGBH0d',
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
  FIRE: 'fire',
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
  spaceBetween: 1,
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
  AQI_WIDGET: 'https://api.waqi.info'
};

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
  COURSE_IN_FOCUS: 'CourseInFocus'
};

export const VIDEO_PLAYER_TITLES = {
  AIR: 'The Current Deadly Killer in the Air',
  WATER: 'Water : The most precious resource',
  EARTH: 'Rediscover our Planet Earth',
  FIRE: 'The Rise of Solar and Wind Energy',
  SPIRIT: 'Handling Depression with Self Love',
  CONFIG: 'About WorldIsOneFamily.com'
};

export const VIDEO_PLAYER_VIDEOS = {
  AIR: 'Xs70ewSdEjE',
  WATER: 'RkdIIfArWqo',
  EARTH: 'ghkQoJoipbM',
  FIRE: 'mmyrbKBZ6SU',
  SPIRIT: 'CEqoCcacR3Y',
  CONFIG: 'SYWb9hNX-1s'
};

// TODO try to find another way
export const PAGE_CATEGORY_MAP = {
  air: 'Air',
  water: 'Water',
  earth: 'Earth',
  energy: 'Energy',
  spirit: 'Spirit'
};

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
  ABOUT_US:'About us Profile'
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
    'Your vote has been recorded. Thanks $NAME for voting..!!',
  CONFIRM_HEADER: 'Confirm',
  CONFIRM_DELETE_ITEM_DESC: 'Are you sure you want to delete this $ITEM?',
  CONFIRM_DELETE_PRIMARY_CTA: 'Yes',
  CONFIRM_DELETE_SECONDARY_CTA: 'No',
  SAVE_IN_PROGRESS: 'Saving $ITEM...',
  DELETE_IN_PROGRESS: 'Deleting $ITEM...'
};

export const AVG_WORD_READ_PER_MIN = 250;

export const IN_FOCUS_TITLE = {
  [ELEMENT_SELECT.EARTH]: 'Animal Rescue in Focus',
  [ELEMENT_SELECT.AIR]: 'City in Focus',
  [ELEMENT_SELECT.FIRE]: 'Innovation in Focus',
  [ELEMENT_SELECT.WATER]: 'River in Focus',
  [ELEMENT_SELECT.SPIRIT]: 'Asana in Focus'
};
