/**
 * Shares an image the way "Share my impact" does (8.17.0): the share sheet
 * on phones and tablets (touch), where it's natural; on a computer the image
 * is saved and the caption copied, ready to paste into a post.
 * @returns 'share' | 'download', or 'cancel' when the share sheet was closed.
 */
export async function shareOrDownload(blob: Blob, fileName: string, title: string, caption: string): Promise<{ method: 'share' | 'download' | 'cancel'; copied: boolean }> {
  const file = new File([blob], fileName, { type: blob.type || 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (touch && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title, text: caption });
      return { method: 'share', copied: false };
    } catch (err: any) {
      if (err?.name === 'AbortError') return { method: 'cancel', copied: false };
      throw err;
    }
  }
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
  let copied = false;
  try {
    await navigator.clipboard.writeText(caption);
    copied = true;
  } catch {
    // Clipboard blocked: the image is still saved.
  }
  return { method: 'download', copied };
}
