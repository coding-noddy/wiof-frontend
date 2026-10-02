/**
 * Admin-managed hero video for one VideoWidgetComponent slot
 * (`hero_videos/{slotId}` — see HERO_VIDEO_SLOTS in app.constants.ts).
 */
export interface HeroVideo {
  id: string;
  title: string;
  // YouTube video ID (11 chars), not a full URL — the widget builds the
  // embed URL from YOUTUBE_EMBED_VIDEO_LINK, and the watch tracker logs it
  // as the contentId.
  videoId: string;
  updatedAt?: any;
  updatedBy?: string;
  // True when the slot has no Firestore doc (or the read failed) and the
  // value came from the built-in VIDEO_PLAYER_* defaults instead.
  isDefault?: boolean;
}
