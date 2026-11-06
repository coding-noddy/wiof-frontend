import { ImpactTile } from '../models/Impact';

/**
 * The "Share my impact" image (8.17.0): a square 1080×1080 PNG that works on
 * LinkedIn, Instagram, WhatsApp and X, drawn on the member's own device
 * (nothing is uploaded). WIOF's colours and fonts, the top three measures
 * with their icons, and an honest "estimated" line.
 */

export const SHARE_SIZE = 1080;
const INK = '#2B2420';
const MUTED = '#6B645F';
const TEAL_TEXT = '#1A7A7F';
const WARM_WHITE = '#FFFCF6';
const IVORY = '#FAF5EC';
const BORDER = '#CAB79E';
const LOGO = 'assets/brand/logos/WIOF-full-logo.png';

export interface ShareCardInput {
  /** "Naved's impact" or "My impact". */
  title: string;
  /** "this November" or "since I started". */
  period: string;
  tiles: ImpactTile[];
  /** "From 12 actions". */
  footnote: string;
}

/** "Naved's impact" / "My impact"; names ending in s get just an apostrophe. */
export function shareTitle(firstName: string | null | undefined): string {
  const name = (firstName || '').trim();
  if (!name) return 'My impact';
  return `${name}${/s$/i.test(name) ? '’' : '’s'} impact`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** An Ionicons icon, recoloured, as an image (they're served at /svg/{name}.svg). */
async function icon(name: string, color: string): Promise<HTMLImageElement | null> {
  try {
    const svg = await (await fetch(`svg/${name}.svg`)).text();
    const coloured = svg.replace('<svg ', `<svg fill="${color}" stroke="${color}" `);
    return await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(coloured)}`);
  } catch {
    return null;
  }
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A colour with transparency, from "#RRGGBB". */
function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Shortens text with "…" to fit a width. */
function fit(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

export async function renderShareCard(input: ShareCardInput): Promise<Blob> {
  // The site's fonts, loaded before drawing so the canvas uses them.
  await Promise.all([
    document.fonts?.load('700 72px Aleo'),
    document.fonts?.load('700 34px "Noto Sans"'),
    document.fonts?.load('400 30px "Noto Sans"')
  ].filter(Boolean)).catch(() => undefined);

  const canvas = document.createElement('canvas');
  canvas.width = SHARE_SIZE;
  canvas.height = SHARE_SIZE;
  const ctx = canvas.getContext('2d')!;
  const pad = 72;

  // Ivory page, Warm White card with the brand border.
  ctx.fillStyle = IVORY;
  ctx.fillRect(0, 0, SHARE_SIZE, SHARE_SIZE);
  roundedRect(ctx, 36, 36, SHARE_SIZE - 72, SHARE_SIZE - 72, 44);
  ctx.fillStyle = WARM_WHITE;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = BORDER;
  ctx.stroke();

  // Logo.
  try {
    const logo = await loadImage(LOGO);
    const h = 96;
    ctx.drawImage(logo, pad, pad, (logo.width / logo.height) * h, h);
  } catch {
    // Without the logo, the footer still names WIOF.
  }

  // Title.
  ctx.fillStyle = TEAL_TEXT;
  ctx.font = '700 28px "Noto Sans", sans-serif';
  ctx.fillText('ESTIMATED IMPACT', pad, 250);
  ctx.fillStyle = INK;
  ctx.font = '700 72px Aleo, serif';
  ctx.fillText(fit(ctx, input.title, SHARE_SIZE - pad * 2), pad, 330);
  ctx.font = '400 40px Aleo, serif';
  ctx.fillStyle = MUTED;
  ctx.fillText(input.period, pad, 388);

  // Up to three measures, one row each.
  const rows = input.tiles.slice(0, 3);
  const rowH = 150;
  let y = 440;
  for (const t of rows) {
    roundedRect(ctx, pad, y, SHARE_SIZE - pad * 2, rowH - 18, 28);
    ctx.fillStyle = tint(t.color, 0.07);
    ctx.fill();

    // Icon in a tinted circle.
    const cx = pad + 70;
    const cy = y + (rowH - 18) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 44, 0, Math.PI * 2);
    ctx.fillStyle = tint(t.color, 0.16);
    ctx.fill();
    const img = await icon(t.icon, t.color);
    if (img) ctx.drawImage(img, cx - 26, cy - 26, 52, 52);

    // Number + unit, label, comparison.
    const tx = pad + 150;
    ctx.fillStyle = INK;
    ctx.font = '700 60px Aleo, serif';
    const num = t.unit ? `${t.number} ${t.unit}` : t.number;
    ctx.fillText(num, tx, cy + 4);
    const numW = ctx.measureText(num).width;
    ctx.font = '700 30px "Noto Sans", sans-serif';
    ctx.fillStyle = t.color;
    ctx.fillText(fit(ctx, t.label, SHARE_SIZE - pad * 2 - (tx - pad) - numW - 40), tx + numW + 18, cy + 2);
    if (t.equivalent) {
      ctx.font = '400 28px "Noto Sans", sans-serif';
      ctx.fillStyle = MUTED;
      ctx.fillText(fit(ctx, t.equivalent, SHARE_SIZE - pad * 2 - (tx - pad) - 30), tx, cy + 46);
    }
    y += rowH;
  }

  // Footer: honest, with the address.
  ctx.font = '400 27px "Noto Sans", sans-serif';
  ctx.fillStyle = MUTED;
  ctx.fillText(fit(ctx, `${input.footnote} · estimates, on the low side`, SHARE_SIZE - pad * 2), pad, SHARE_SIZE - 128);
  ctx.font = '700 34px "Noto Sans", sans-serif';
  ctx.fillStyle = TEAL_TEXT;
  ctx.fillText('Join me at worldisonefamily.com', pad, SHARE_SIZE - 80);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the image'))), 'image/png'));
}
