/**
 * Impact of an action (8.13.0): a small recipe on the action, set by admins
 * with its assumption and source, that turns what someone did ("the fan was
 * off for 15 minutes") into what it saved ("about 0.01 kWh"), in human terms.
 *
 * Estimates are deliberately conservative (the low end of typical values)
 * and always shown as "about", with the assumption. They are self-reported:
 * a Planet Passport milestone built on them must say so (docs/METRICS.md).
 */

/**
 * Sourced conversion factors, shared with the energy widget.
 * - Grid CO2: 0.82 kg CO2/kWh — CEA CO2 Baseline Database for the Indian Power Sector
 * - Petrol CO2: 2.31 kg CO2/litre, diesel 2.68 — IPCC 2019 Refinement to the 2006 Guidelines
 * - Car mileage: 15 km/litre (India average petrol car); SUV 12 km/litre (diesel)
 */
export const IMPACT_FACTORS = {
  CO2_PER_KWH: 0.82,
  CO2_PER_PETROL: 2.31,
  CO2_PER_DIESEL: 2.68,
  KM_PER_L_CAR: 15,
  KM_PER_L_SUV: 12,
  LITRES_PER_BUCKET: 15
} as const;

/** kg CO2 per km in an average petrol car (2.31 / 15 ≈ 0.154). */
export const CAR_CO2_PER_KM = IMPACT_FACTORS.CO2_PER_PETROL / IMPACT_FACTORS.KM_PER_L_CAR;

export type ImpactMeasure = 'water' | 'energy' | 'co2' | 'plastic' | 'food';

export const IMPACT_MEASURES: { value: ImpactMeasure; label: string; unit: string }[] = [
  { value: 'water', label: 'Water', unit: 'L' },
  { value: 'energy', label: 'Electricity', unit: 'kWh' },
  { value: 'co2', label: 'CO₂ (travel, food)', unit: 'kg CO₂' },
  { value: 'plastic', label: 'Plastic items avoided', unit: 'items' },
  { value: 'food', label: 'Food not wasted', unit: 'kg' }
];

export interface ActionImpact {
  measure: ImpactMeasure;
  /** Saved per one of the input unit, in the measure's unit (L, kWh, kg CO2, items, kg). */
  perUnit: number;
  /** What the person enters, e.g. "Minutes the fan was off". */
  inputLabel: string;
  /** Its unit, e.g. "min", "km", "loads". */
  inputUnit: string;
  /** Prefilled, and what "Skip" counts: a typical, modest amount. */
  inputDefault: number;
  /** The most one completion can count (the server caps it too). */
  inputMax: number;
  /** For plastic: what the items are, plural ("plastic bottles"). */
  resultLabel?: string;
  /** Shown with the result, e.g. "A ceiling fan uses about 50 W." */
  assumption: string;
  source?: string;
  /** Drafts are written by WIOF for admins to check; reviewed ones were. */
  status: 'draft' | 'reviewed';
}

/** A valid recipe, or null (missing, broken or a non-positive rate). */
export function validImpact(impact: ActionImpact | null | undefined): ActionImpact | null {
  if (!impact || !IMPACT_MEASURES.some((m) => m.value === impact.measure)) return null;
  const ok = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n > 0;
  return ok(impact.perUnit) && ok(impact.inputDefault) && ok(impact.inputMax) ? impact : null;
}

/** The amount someone entered, kept within 0 and the recipe's maximum. */
export function clampAmount(impact: ActionImpact, amount: number | null | undefined): number {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, impact.inputMax);
}

/** Saved by `amount` of the input (in the measure's unit). */
export function impactValue(impact: ActionImpact, amount: number): number {
  return clampAmount(impact, amount) * impact.perUnit;
}

/** Rounded the way people read it: 0.012 → "0.01", 4.36 → "4.4", 1234 → "1,234". */
export function roundForPeople(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  const digits = value < 0.1 ? 2 : value < 10 ? 1 : 0;
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return value < 0.01 ? '< 0.01' : '0';
  return rounded.toLocaleString('en-IN', { maximumFractionDigits: digits });
}

/** The value as shown (roundForPeople), as a number; tiny values stay as they are. */
export function shownValue(value: number): number {
  const shown = roundForPeople(value);
  return shown.startsWith('<') ? value : Number(shown.replace(/,/g, ''));
}

/** "about 18 L of water", "about 0.03 kWh", "3 plastic bottles". */
export function formatImpact(impact: ActionImpact, value: number): string {
  const v = roundForPeople(value);
  // "under 0.01 kWh", not "about < 0.01 kWh".
  const about = v.startsWith('<') ? `under ${v.slice(2)}` : `about ${v}`;
  switch (impact.measure) {
    case 'water': return `${about} L of water`;
    case 'energy': return `${about} kWh of electricity`;
    case 'co2': return `${about} kg of CO₂`;
    case 'food': return `${about} kg of food`;
    case 'plastic': return `${v} ${impact.resultLabel || 'plastic items'}`;
  }
}

/** The same in everyday terms, when there's a good one: "≈ 1 bucket", "≈ 2 km by car". */
export function everydayEquivalent(impact: ActionImpact, rawValue: number): string | null {
  const value = shownValue(rawValue);
  const km = (kgCo2: number) => kgCo2 / CAR_CO2_PER_KM;
  const plural = (n: string, one: string, many: string) => `≈ ${n} ${n === '1' ? one : many}`;
  switch (impact.measure) {
    case 'water': {
      const buckets = value / IMPACT_FACTORS.LITRES_PER_BUCKET;
      return buckets >= 0.5 ? plural(roundForPeople(buckets), 'bucket', 'buckets') : null;
    }
    case 'energy': {
      const co2 = value * IMPACT_FACTORS.CO2_PER_KWH;
      if (co2 < 0.01) return null; // too small to compare with anything
      const d = km(co2);
      return d >= 0.1 ? `≈ ${roundForPeople(co2)} kg CO₂, like ${roundForPeople(d)} km by car` : `≈ ${roundForPeople(co2)} kg CO₂`;
    }
    case 'co2': {
      const d = km(value);
      return d >= 0.1 ? `like ${roundForPeople(d)} km by car` : null;
    }
    default:
      return null;
  }
}

/** How often to assume in the calculator, from the action's cadence. */
export function defaultFrequency(repeatType: string | null | undefined): { times: number; per: 'week' | 'month' } | null {
  switch (repeatType) {
    case 'DAILY': return { times: 7, per: 'week' };
    case 'REPEATABLE': return { times: 3, per: 'week' };
    case 'OCCASIONAL': return { times: 1, per: 'month' };
    default: return null; // ONCE: just this time
  }
}

/** Over a month and a year, from a per-time value and a frequency. */
export function projectImpact(perTime: number, frequency: { times: number; per: 'week' | 'month' }): { month: number; year: number } {
  const perMonth = frequency.per === 'week' ? perTime * frequency.times * (52 / 12) : perTime * frequency.times;
  return { month: perMonth, year: perMonth * 12 };
}

/** India-time month, "YYYY-MM", as the server files totals (functions/impact.js). */
export function impactMonth(date = new Date()): string {
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

export interface ImpactLine {
  measure: ImpactMeasure;
  text: string;
  equivalent: string | null;
}

/** Totals by measure as lines to show, in a fixed order, leaving out zeros. */
export function impactLines(totals: { [measure: string]: number } | null | undefined): ImpactLine[] {
  return IMPACT_MEASURES
    .filter((m) => (totals?.[m.value] || 0) > 0)
    .map((m) => {
      const recipe = { measure: m.value, resultLabel: 'plastic items avoided' } as ActionImpact;
      const value = totals![m.value];
      return { measure: m.value, text: formatImpact(recipe, value), equivalent: everydayEquivalent(recipe, value) };
    });
}

/** How each measure looks as a tile and on the share image (8.17.0). */
export const MEASURE_LOOK: Record<ImpactMeasure, { unit: string; label: string; icon: string; color: string }> = {
  water: { unit: 'L', label: 'water saved', icon: 'water', color: '#1A7A7F' },
  energy: { unit: 'kWh', label: 'electricity saved', icon: 'flash', color: '#805E2C' },
  co2: { unit: 'kg', label: 'CO₂ avoided', icon: 'leaf', color: '#856C4A' },
  plastic: { unit: '', label: 'plastic items avoided', icon: 'bag-handle', color: '#145C5F' },
  food: { unit: 'kg', label: 'food not wasted', icon: 'restaurant', color: '#645138' }
};

export interface ImpactTile {
  measure: ImpactMeasure;
  /** "36", "4.4", "1,200". */
  number: string;
  unit: string;
  label: string;
  icon: string;
  color: string;
  /** "≈ 2 buckets", "like 23 km by car", or null. */
  equivalent: string | null;
}

/** Totals by measure as tiles, in a fixed order, leaving out zeros. */
export function impactTiles(totals: { [measure: string]: number } | null | undefined): ImpactTile[] {
  return IMPACT_MEASURES
    .filter((m) => (totals?.[m.value] || 0) > 0)
    .map((m) => {
      const value = totals![m.value];
      const look = MEASURE_LOOK[m.value];
      const number = roundForPeople(value);
      return { measure: m.value, number, ...look, equivalent: everydayEquivalent({ measure: m.value } as ActionImpact, value) };
    });
}

/** "November 2026" for an India-time month key "2026-11". */
export function monthName(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, 15)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
