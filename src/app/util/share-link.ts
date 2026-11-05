import { UiUtilService } from './UiUtilService';

/**
 * Shares a link: the device's share sheet where there is one, otherwise
 * copy to clipboard with a toast. Closing the share sheet is not a failure,
 * so it does nothing (it used to fall through to "Link copied").
 */
export async function shareLink(data: ShareData & { url: string }, uiUtil: UiUtilService): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(data.url);
    void uiUtil.presentToast('Link copied', 'success', 2500);
  } catch {
    void uiUtil.presentToast('Could not copy the link. Please copy it from the address bar.', 'error');
  }
}
