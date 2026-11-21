import { Stamp } from '../models/Passport';
import { BADGE_CARD_H, BADGE_CARD_W, badgeShareCaption, drawStamp, earnedLine, renderBadgeCard } from './badge-share-image';

const stamp = (over: Partial<Stamp> = {}): Stamp => ({
  id: 'honeycomb', family: 'milestone', title: ['Honey', 'comb'], name: 'Honeycomb', caption: 'MILESTONE',
  meaning: 'One action on six different weeks, built cell by cell.', element: null, shape: 'hexagon', ink: '#145C5F',
  rotation: 4, earned: true, earnedAt: new Date(2026, 10, 19), dateKnown: true, progress: 6, target: 6, hint: '', unit: 'weeks', ...over
});

describe('Badge share image', () => {
  it('says when it was earned, or honestly that it was before launch', () => {
    expect(earnedLine(stamp())).toBe('Earned 19 November 2026');
    expect(earnedLine(stamp({ dateKnown: false }))).toBe('Earned before the Passport launched');
  });

  it('writes a caption with the badge, its meaning and the link, and nothing about the member', () => {
    const caption = badgeShareCaption(stamp(), 'https://worldisonefamily.com/home');
    expect(caption).toBe('I earned the Honeycomb badge in my WIOF Planet Passport. One action on six different weeks, built cell by cell. https://worldisonefamily.com/home');
  });

  it('draws a portrait PNG card', async () => {
    const blob = await renderBadgeCard(stamp());
    expect(blob.type).toBe('image/png');
    const bitmap = await createImageBitmap(blob);
    expect([bitmap.width, bitmap.height]).toEqual([BADGE_CARD_W, BADGE_CARD_H]);
  });

  it('draws every stamp shape in its ink', () => {
    for (const shape of ['circle', 'triangle', 'square', 'pentagon', 'hexagon', 'oval', 'rect', 'rosette'] as Stamp['shape'][]) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 300;
      const ctx = canvas.getContext('2d')!;
      drawStamp(ctx, stamp({ shape, id: shape }), 150, 150, 220);
      const data = ctx.getImageData(0, 0, 300, 300).data;
      let inked = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) inked++;
      expect(inked).withContext(shape).toBeGreaterThan(1500);
    }
  });
});
