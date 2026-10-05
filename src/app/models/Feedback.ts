export type FeedbackCategory = 'issue' | 'idea' | 'content' | 'other';
export type FeedbackStatus = 'new' | 'reviewed' | 'resolved';

export const FEEDBACK_CATEGORIES: { value: FeedbackCategory; label: string; icon: string }[] = [
  { value: 'issue', label: 'Report an issue', icon: 'bug-outline' },
  { value: 'idea', label: 'Idea or suggestion', icon: 'bulb-outline' },
  { value: 'content', label: 'Content feedback', icon: 'book-outline' },
  { value: 'other', label: 'Something else', icon: 'chatbubble-ellipses-outline' }
];

// Categories used before the list above — kept so older entries still show
// a readable label in the admin table and export.
export const LEGACY_FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  improvement: 'Improvement',
  suggestion: 'Suggestion'
};

export const FEEDBACK_STATUSES: FeedbackStatus[] = ['new', 'reviewed', 'resolved'];

// Field limits — keep in sync with the Feedback/{id} create rule in firestore.rules.
export const FEEDBACK_LIMITS = {
  MESSAGE_MIN: 10,
  MESSAGE_MAX: 2000,
  NAME_MAX: 100,
  EMAIL_MAX: 254
};

export interface Feedback {
  id?: string;
  category: FeedbackCategory;
  message: string;
  name?: string;
  email?: string;
  pageUrl: string;
  userAgent: string;
  userId?: string;
  status: FeedbackStatus;
  // Firestore Timestamp on read; serverTimestamp() sentinel on write.
  createdAt: any;
}
