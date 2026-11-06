import {
  ActionImpact,
  clampAmount,
  defaultFrequency,
  everydayEquivalent,
  formatImpact,
  impactValue,
  projectImpact,
  roundForPeople,
  validImpact
} from './Impact';

const tap: ActionImpact = {
  measure: 'water', perUnit: 6, inputLabel: 'Minutes the tap would have run', inputUnit: 'min',
  inputDefault: 2, inputMax: 30, assumption: 'A tap runs at about 6 litres a minute.', status: 'draft'
};
const fan: ActionImpact = { ...tap, measure: 'energy', perUnit: 0.00083, inputDefault: 30, inputMax: 720 };
const walk: ActionImpact = { ...tap, measure: 'co2', perUnit: 0.154, inputDefault: 1, inputMax: 50 };

describe('Impact (8.13.0)', () => {
  it('works out what one time saved, capped at the recipe\'s maximum', () => {
    expect(impactValue(tap, 2)).toBe(12);
    expect(impactValue(tap, 1000)).toBe(180);
    expect(clampAmount(tap, -3)).toBe(0);
    expect(clampAmount(tap, NaN)).toBe(0);
  });

  it('says it the way people read it', () => {
    expect(formatImpact(tap, 12)).toBe('about 12 L of water');
    expect(formatImpact(fan, 0.0249)).toBe('about 0.02 kWh of electricity');
    expect(formatImpact(fan, 0.004)).toBe('under 0.01 kWh of electricity');
    expect(formatImpact({ ...tap, measure: 'plastic', resultLabel: 'plastic bottles' }, 3)).toBe('3 plastic bottles');
    expect(roundForPeople(4.36)).toBe('4.4');
    expect(roundForPeople(12345)).toBe('12,345');
    expect(roundForPeople(0.004)).toBe('< 0.01');
  });

  it('gives an everyday comparison when there is a good one', () => {
    expect(everydayEquivalent(tap, 30)).toBe('≈ 2 buckets');
    expect(everydayEquivalent(tap, 15)).toBe('≈ 1 bucket');
    expect(everydayEquivalent(tap, 3)).toBeNull();
    expect(everydayEquivalent(walk, 1.54)).toBe('like 10 km by car');
    expect(everydayEquivalent(fan, 10)).toBe('≈ 8.2 kg CO₂, like 53 km by car');
  });

  it('projects a month and a year from how often', () => {
    expect(defaultFrequency('DAILY')).toEqual({ times: 7, per: 'week' });
    expect(defaultFrequency('ONCE')).toBeNull();
    const { month, year } = projectImpact(12, { times: 7, per: 'week' });
    expect(Math.round(month)).toBe(364);
    expect(Math.round(year)).toBe(4368);
    expect(projectImpact(10, { times: 1, per: 'month' })).toEqual({ month: 10, year: 120 });
  });

  it('ignores a broken recipe', () => {
    expect(validImpact(tap)).toBe(tap);
    expect(validImpact({ ...tap, perUnit: 0 })).toBeNull();
    expect(validImpact({ ...tap, measure: 'gold' as any })).toBeNull();
    expect(validImpact(null)).toBeNull();
  });
});
