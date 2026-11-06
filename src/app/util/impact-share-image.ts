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

/**
 * Row sizes by how many measures there are: three fit roomy rows, four and
 * five get tighter ones (five drop the comparison line). All rows sit
 * between y 370 and about 842, above the footer.
 */
const ROW_LAYOUTS = {
  roomy: { box: 142, gap: 20, num: 60, label: 30, eq: 28, eqBase: -2, eqLine: 42, soloBase: 20, r: 44, img: 52, tx: 150 },
  four: { box: 104, gap: 16, num: 50, label: 28, eq: 25, eqBase: -4, eqLine: 32, soloBase: 17, r: 36, img: 42, tx: 130 },
  five: { box: 84, gap: 13, num: 46, label: 27, eq: 0, eqBase: 0, eqLine: 0, soloBase: 16, r: 30, img: 36, tx: 115 }
};

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

/** Splits text into at most `max` lines that fit a width (the last one shortened with "…"). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max = 2): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  kept[max - 1] = fit(ctx, `${kept[max - 1]} ${lines.slice(max).join(' ')}`, width);
  return kept;
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
    const h = 84;
    ctx.drawImage(logo, pad, pad, (logo.width / logo.height) * h, h);
  } catch {
    // Without the logo, the footer still names WIOF.
  }

  // Title.
  ctx.fillStyle = TEAL_TEXT;
  ctx.font = '700 28px "Noto Sans", sans-serif';
  ctx.fillText('ESTIMATED IMPACT', pad, 210);
  ctx.fillStyle = INK;
  ctx.font = '700 72px Aleo, serif';
  ctx.fillText(fit(ctx, input.title, SHARE_SIZE - pad * 2), pad, 282);
  ctx.font = '400 40px Aleo, serif';
  ctx.fillStyle = MUTED;
  ctx.fillText(input.period, pad, 332);

  // Every measure (at most five), one row each.
  const rows = input.tiles.slice(0, 5);
  const L = rows.length <= 3 ? ROW_LAYOUTS.roomy : rows.length === 4 ? ROW_LAYOUTS.four : ROW_LAYOUTS.five;
  const boxH = L.box;
  let y = 370;
  for (const t of rows) {
    roundedRect(ctx, pad, y, SHARE_SIZE - pad * 2, boxH, Math.min(28, boxH / 3));
    ctx.fillStyle = tint(t.tint, 0.1);
    ctx.fill();

    // Icon in a tinted circle.
    const cx = pad + L.r + 26;
    const cy = y + boxH / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, L.r, 0, Math.PI * 2);
    ctx.fillStyle = tint(t.tint, 0.28);
    ctx.fill();
    const img = await icon(t.icon, t.color);
    if (img) ctx.drawImage(img, cx - L.img / 2, cy - L.img / 2, L.img, L.img);

    // Number + unit, label, comparison; the number alone is centred.
    const tx = pad + L.tx;
    const withEq = !!t.equivalent && L.eq > 0;
    const base = cy + (withEq ? L.eqBase : L.soloBase);
    ctx.fillStyle = INK;
    ctx.font = `700 ${L.num}px Aleo, serif`;
    // The unit smaller than the number, as on the My Journey card.
    ctx.fillText(t.number, tx, base);
    let numW = ctx.measureText(t.number).width;
    if (t.unit) {
      ctx.font = `700 ${Math.round(L.num * 0.6)}px Aleo, serif`;
      const gapW = L.num * 0.14;
      ctx.fillText(t.unit, tx + numW + gapW, base);
      numW += gapW + ctx.measureText(t.unit).width;
    }
    ctx.font = `700 ${L.label}px "Noto Sans", sans-serif`;
    ctx.fillStyle = t.color;
    ctx.fillText(fit(ctx, t.label, SHARE_SIZE - pad * 2 - (tx - pad) - numW - 40), tx + numW + 18, base - 2);
    if (withEq) {
      ctx.font = `400 ${L.eq}px "Noto Sans", sans-serif`;
      ctx.fillStyle = MUTED;
      ctx.fillText(fit(ctx, t.equivalent!, SHARE_SIZE - pad * 2 - (tx - pad) - 30), tx, cy + L.eqLine);
    }
    y += boxH + L.gap;
  }

  // Footer: honest, with the address. "Estimates" always gets a line of its own.
  ctx.font = '400 27px "Noto Sans", sans-serif';
  ctx.fillStyle = MUTED;
  const note = [...wrap(ctx, `${input.footnote}.`, SHARE_SIZE - pad * 2, 1), 'Estimates, on the low side.'];
  note.forEach((l, i) => ctx.fillText(l, pad, SHARE_SIZE - 146 - (note.length - 1 - i) * 34));
  ctx.font = '700 34px "Noto Sans", sans-serif';
  ctx.fillStyle = TEAL_TEXT;
  ctx.fillText('Join me at worldisonefamily.com', pad, SHARE_SIZE - 90);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the image'))), 'image/png'));
}
