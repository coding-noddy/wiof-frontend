import { sharedBecause, sharedMeaning, Stamp, stampDateText } from '../models/Passport';

/**
 * "Share this badge" (Passport design §6, step 1): one earned stamp on a
 * portrait 1080×1350 card (good for stories, WhatsApp and feeds), drawn on
 * the member's own device; nothing is uploaded. It shows the stamp, its
 * name and meaning, the date earned, and the WIOF address. No member
 * number, no other stamps, no name: one moment, nothing more about them.
 */

export const BADGE_CARD_W = 1080;
export const BADGE_CARD_H = 1350;
const INK = '#2B2420';
const MUTED = '#6B645F';
const TEAL_TEXT = '#1A7A7F';
const WARM_WHITE = '#FFFCF6';
const IVORY = '#FAF5EC';
const BORDER = '#CAB79E';
const LOGO = 'assets/brand/logos/WIOF-full-logo.png';

/** A small deterministic random sequence (the same grain for a stamp every time). */
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** The outline of a stamp's shape, in a 160×160 box (the same geometry as passport-stamp.component). */
function shapePath(ctx: CanvasRenderingContext2D, shape: Stamp['shape'], inner: boolean): void {
  const polygon = (sides: number, r: number, cy = 80) => {
    const offset = sides === 4 ? Math.PI / 4 : sides === 6 ? 0 : -Math.PI / 2;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = offset + (2 * Math.PI * i) / sides;
      const x = 80 + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  };
  switch (shape) {
    case 'circle': ctx.beginPath(); ctx.arc(80, 80, inner ? 67 : 74, 0, Math.PI * 2); break;
    case 'oval': ctx.beginPath(); ctx.ellipse(80, 80, inner ? 66 : 74, inner ? 50 : 58, 0, 0, Math.PI * 2); break;
    case 'rect': {
      const [x, y, w, h, r] = inner ? [16, 32, 128, 96, 6] : [8, 24, 144, 112, 10];
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); break;
    }
    case 'triangle': polygon(3, inner ? 72 : 84, 96); break;
    case 'square': polygon(4, inner ? 88 : 98); break;
    case 'pentagon': polygon(5, inner ? 69 : 78, 86); break;
    case 'hexagon': polygon(6, inner ? 67 : 76); break;
    case 'rosette': {
      if (inner) { ctx.beginPath(); ctx.arc(80, 80, 60, 0, Math.PI * 2); break; }
      const count = 18;
      const r = 72;
      const bump = (r * Math.PI / count) * 1.05;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const a0 = (2 * Math.PI * i) / count - Math.PI / 2;
        const a1 = (2 * Math.PI * (i + 1)) / count - Math.PI / 2;
        const mid = (a0 + a1) / 2;
        const mx = 80 + (r + bump * 0.55) * Math.cos(mid);
        const my = 80 + (r + bump * 0.55) * Math.sin(mid);
        if (i === 0) ctx.moveTo(80 + r * Math.cos(a0), 80 + r * Math.sin(a0));
        ctx.quadraticCurveTo(mx, my, 80 + r * Math.cos(a1), 80 + r * Math.sin(a1));
      }
      ctx.closePath();
      break;
    }
  }
}

/** Text along the top of a circle (the caption of round stamps). */
function arcText(ctx: CanvasRenderingContext2D, text: string, radius: number, top = true): void {
  const spacing = 0.16;
  const letters = [...text];
  const widths = letters.map((ch) => ctx.measureText(ch).width + ctx.measureText('M').width * spacing);
  const total = widths.reduce((a, b) => a + b, 0);
  let angle = (top ? -Math.PI / 2 : Math.PI / 2) + (top ? -1 : 1) * (total / radius) / 2;
  for (let i = 0; i < letters.length; i++) {
    const step = widths[i] / radius;
    angle += (top ? 1 : -1) * step / 2;
    ctx.save();
    ctx.translate(80 + radius * Math.cos(angle), 80 + radius * Math.sin(angle));
    ctx.rotate(angle + (top ? Math.PI / 2 : -Math.PI / 2));
    ctx.fillText(letters[i], 0, 0);
    ctx.restore();
    angle += (top ? 1 : -1) * step / 2;
  }
}

/**
 * Draws an earned stamp, inked, tilted and grainy, centred at (cx, cy), `size` px wide.
 * Drawn on its own canvas first so the grain only eats into the ink.
 */
export function drawStamp(ctx: CanvasRenderingContext2D, stamp: Stamp, cx: number, cy: number, size: number, dateText = stampDateText(stamp)): void {
  const scale = size / 160;
  const off = document.createElement('canvas');
  off.width = off.height = Math.ceil(size * 1.3);
  const s = off.getContext('2d')!;
  s.translate(off.width / 2, off.height / 2);
  s.rotate((stamp.rotation * Math.PI) / 180);
  s.scale(scale, scale);
  s.translate(-80, -80);
  s.strokeStyle = stamp.ink;
  s.fillStyle = stamp.ink;
  s.lineJoin = 'round';

  shapePath(s, stamp.shape, false);
  s.lineWidth = 4;
  s.stroke();
  shapePath(s, stamp.shape, true);
  s.lineWidth = 1.5;
  s.stroke();

  s.textAlign = 'center';
  s.textBaseline = 'alphabetic';
  const round = stamp.shape === 'circle' || stamp.shape === 'rosette';
  s.font = '800 11px "Noto Sans", sans-serif';
  if (round) {
    arcText(s, stamp.caption, 54, true);
    if (stamp.shape === 'circle') arcText(s, 'WORLD IS ONE FAMILY', 62, false);
  } else if (stamp.shape !== 'triangle') {
    const capY = { rect: 50, oval: 46, square: 40, pentagon: 58, hexagon: 40 }[stamp.shape as string] ?? 46;
    s.fillText(stamp.caption, 80, capY);
  }

  const lines = stamp.title;
  const triangle = stamp.shape === 'triangle';
  const gap = triangle ? 16 : 19;
  const base = triangle ? 98 : stamp.shape === 'pentagon' ? 90 : 80;
  const y = (i: number) => base + (i - (lines.length - 1) / 2) * gap - 6;
  const titleSize = triangle ? (lines.length === 1 ? 17 : 14) : lines.length === 1 ? 22 : 18;
  s.font = `700 ${titleSize}px Aleo, serif`;
  lines.forEach((line, i) => s.fillText(line.toUpperCase(), 80, y(i) + 6));
  s.font = '800 10px "Noto Sans", sans-serif';
  s.fillText(dateText, 80, y(lines.length) + (triangle ? 8 : 10));

  // Ink grain: small specks where the ink didn't take.
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'destination-out';
  const rand = seeded(stamp.id);
  for (let i = 0; i < 1400; i++) {
    s.globalAlpha = 0.35 + rand() * 0.65;
    s.beginPath();
    s.arc(rand() * off.width, rand() * off.height, 0.6 + rand() * 1.6 * scale, 0, Math.PI * 2);
    s.fill();
  }

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.drawImage(off, cx - off.width / 2, cy - off.height / 2);
  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Splits text into lines that fit a width. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

/** At most `max` lines; a cut ends in "…" (never mid-word). */
function clip(ctx: CanvasRenderingContext2D, lines: string[], max: number, width: number): string[] {
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1];
  while (last.includes(' ') && ctx.measureText(`${last}…`).width > width) last = last.slice(0, last.lastIndexOf(' '));
  kept[max - 1] = `${last.replace(/[\s,;:.]+$/, '')}…`;
  return kept;
}

/** "Earned 19 November 2026", or "Earned before the Passport launched". */
export function earnedLine(stamp: Pick<Stamp, 'earnedAt' | 'dateKnown'>): string {
  if (!stamp.dateKnown || !stamp.earnedAt) return 'Earned before the Passport launched';
  return `Earned ${stamp.earnedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

/** The text that goes with the image: the badge, why it was earned, what it means. */
export function badgeShareCaption(stamp: Pick<Stamp, 'name' | 'meaning' | 'rule' | 'evidence' | 'window' | 'family'>, url: string): string {
  return `I earned the ${stamp.name} badge in my WIOF Planet Passport. ${sharedBecause(stamp)} ${sharedMeaning(stamp)} ${url}`.replace(/\s+/g, ' ').trim();
}

export async function renderBadgeCard(stamp: Stamp): Promise<Blob> {
  await Promise.all([
    document.fonts?.load('700 64px Aleo'),
    document.fonts?.load('700 18px Aleo'),
    document.fonts?.load('800 11px "Noto Sans"'),
    document.fonts?.load('400 34px "Noto Sans"')
  ].filter(Boolean)).catch(() => undefined);

  const canvas = document.createElement('canvas');
  canvas.width = BADGE_CARD_W;
  canvas.height = BADGE_CARD_H;
  const ctx = canvas.getContext('2d')!;
  const pad = 80;

  // Ivory page, Warm White card with the brand border (like the impact card).
  ctx.fillStyle = IVORY;
  ctx.fillRect(0, 0, BADGE_CARD_W, BADGE_CARD_H);
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(36, 36, BADGE_CARD_W - 72, BADGE_CARD_H - 72, 44) : ctx.rect(36, 36, BADGE_CARD_W - 72, BADGE_CARD_H - 72);
  ctx.fillStyle = WARM_WHITE;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = BORDER;
  ctx.stroke();

  try {
    const logo = await loadImage(LOGO);
    const h = 80;
    ctx.drawImage(logo, pad, pad, (logo.width / logo.height) * h, h);
  } catch {
    // The footer still names WIOF.
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = TEAL_TEXT;
  ctx.font = '700 26px "Noto Sans", sans-serif';
  ctx.fillText('PLANET PASSPORT', BADGE_CARD_W - pad, pad + 50);

  // The stamp, large, on a faint wash of its ink.
  const cy = 520;
  ctx.beginPath();
  ctx.arc(BADGE_CARD_W / 2, cy, 300, 0, Math.PI * 2);
  ctx.fillStyle = `${stamp.ink}10`;
  ctx.fill();
  drawStamp(ctx, stamp, BADGE_CARD_W / 2, cy, 480);

  // Name; why it was earned (what this member did); what it means; the date.
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = '700 68px Aleo, serif';
  ctx.fillText(stamp.name, BADGE_CARD_W / 2, 930);
  ctx.font = '600 36px "Noto Sans", sans-serif';
  ctx.fillStyle = stamp.ink;
  const why = wrap(ctx, sharedBecause(stamp), BADGE_CARD_W - pad * 2).slice(0, 2);
  why.forEach((l, i) => ctx.fillText(l, BADGE_CARD_W / 2, 992 + i * 46));
  const meaningTop = 992 + why.length * 46 + 14;
  ctx.font = '400 29px "Noto Sans", sans-serif';
  ctx.fillStyle = MUTED;
  // In the first person, as the member would say it; left out when it only repeats the why.
  const meaningText = sharedMeaning(stamp);
  const meaning = meaningText ? clip(ctx, wrap(ctx, meaningText, BADGE_CARD_W - pad * 2), why.length > 1 ? 2 : 3, BADGE_CARD_W - pad * 2) : [];
  meaning.forEach((l, i) => ctx.fillText(l, BADGE_CARD_W / 2, meaningTop + i * 40));
  ctx.font = '400 28px "Noto Sans", sans-serif';
  ctx.fillText(earnedLine(stamp), BADGE_CARD_W / 2, meaningTop + meaning.length * 40 + 22);

  ctx.fillStyle = TEAL_TEXT;
  ctx.font = '700 34px "Noto Sans", sans-serif';
  ctx.fillText('Join me at worldisonefamily.com', BADGE_CARD_W / 2, BADGE_CARD_H - 90);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the image'))), 'image/png'));
}
