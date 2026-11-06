import { everydayEquivalent, impactTiles, monthName } from 'src/app/models/Impact';
import { shareTitle } from 'src/app/util/impact-share-image';
import { shareCaption } from './impact-summary.component';

describe('Your impact: tiles and sharing (8.17.0)', () => {
  it('one tile per measure, in order, with its number, unit, label and colour', () => {
    const tiles = impactTiles({ co2: 1.8, water: 36, energy: 4.4, plastic: 0 });
    expect(tiles.map((t) => t.measure)).toEqual(['water', 'energy', 'co2']);
    expect(tiles[0]).toEqual(jasmine.objectContaining({ number: '36', unit: 'L', label: 'water saved', icon: 'water', equivalent: '≈ 2.4 buckets' }));
    expect(tiles[2].label).toBe('CO₂ avoided');
  });

  it('the same shown number always gets the same comparison', () => {
    const energy = { measure: 'energy' } as any;
    // 4.36 and 4.44 both show as "4.4 kWh": they used to say 23 and 24 km.
    expect(everydayEquivalent(energy, 4.36)).toBe(everydayEquivalent(energy, 4.44));
  });

  it('names the month', () => {
    expect(monthName('2026-11')).toBe('November 2026');
  });

  it('the image title has the first name only when asked, with a proper apostrophe', () => {
    expect(shareTitle(null)).toBe('My impact');
    expect(shareTitle('Naved')).toBe('Naved\u2019s impact');
    expect(shareTitle('James')).toBe('James\u2019 impact');
  });

  it('the caption says what, honestly, and where', () => {
    const tiles = impactTiles({ water: 36, energy: 4.4, co2: 1.8 });
    expect(shareCaption(tiles, 'month', 'November 2026', 'https://worldisonefamily.com/take-action'))
      .toBe('My estimated impact in November 2026 with World Is One Family: 36 L water, 4.4 kWh electricity, 1.8 kg CO₂. Small actions add up. Join me: https://worldisonefamily.com/take-action');
  });
});
