import { AngularFireStorage } from '@angular/fire/compat/storage';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

/** Widest image we store; wider uploads are scaled down to this. */
export const MAX_UPLOAD_IMAGE_WIDTH = 1600;
const QUALITY = 0.82;
/** Below this size an image that already fits is left exactly as uploaded. */
const ALREADY_SMALL_BYTES = 200 * 1024;

/**
 * Shrinks an admin-uploaded image before it goes to Storage: scaled down to
 * MAX_UPLOAD_IMAGE_WIDTH and re-encoded as WebP (JPEG where the browser can't
 * encode WebP). Admins were uploading 1–10 MB originals that every visitor
 * then downloaded in full.
 *
 * Returns the original file whenever compressing wouldn't help: GIFs and SVGs
 * (animation/vector), images that are already small, anything the browser
 * can't decode, or a result that isn't actually smaller.
 */
export async function compressImage(file: Blob): Promise<Blob> {
  if (!file?.type?.startsWith('image/') || /gif|svg/.test(file.type)) {
    return file;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    if (bitmap.width <= MAX_UPLOAD_IMAGE_WIDTH && file.size <= ALREADY_SMALL_BYTES) {
      return file;
    }
    const scale = Math.min(1, MAX_UPLOAD_IMAGE_WIDTH / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let out = await toBlob(canvas, 'image/webp');
    if (!out || out.type !== 'image/webp') {
      // No WebP encoder (older Safari): JPEG has no transparency, so paint the
      // image over white first.
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      out = await toBlob(canvas, 'image/jpeg');
    }
    return out && out.size < file.size ? out : file;
  } finally {
    bitmap.close();
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * Browsers may keep an uploaded image for 7 days. Storage's default is
 * `private, max-age=0`, which re-downloads every image on every visit.
 */
export const UPLOADED_IMAGE_CACHE_CONTROL = 'public, max-age=604800';

/**
 * Compresses (see compressImage) and uploads to `path`. Emits the finished
 * upload snapshot once, like `from(storage.upload(...))` did. The object
 * keeps its name; its content type comes from the compressed file.
 */
export function uploadCompressedImage(
  storage: AngularFireStorage,
  path: string,
  file: Blob
) {
  return from(compressImage(file)).pipe(
    switchMap((image) =>
      from(storage.upload(path, image, { cacheControl: UPLOADED_IMAGE_CACHE_CONTROL }))
    )
  );
}
