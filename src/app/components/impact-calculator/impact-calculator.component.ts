import { Component, Input, OnChanges } from '@angular/core';
import { ActionItem } from 'src/app/models/ActionItem';
import {
  ActionImpact,
  clampAmount,
  defaultFrequency,
  everydayEquivalent,
  formatImpact,
  impactValue,
  projectImpact,
  validImpact
} from 'src/app/models/Impact';

const MAX_TIMES = 50;

/**
 * "What could I save?" (8.13.0), in an action's details: the person sets how
 * much (prefilled with the recipe's modest default) and how often, and sees
 * an estimate for each time, a month and a year, in everyday terms, with the
 * assumption and its source. Nothing is saved; it's for curiosity.
 */
@Component({
  selector: 'app-impact-calculator',
  templateUrl: './impact-calculator.component.html',
  styleUrls: ['./impact-calculator.component.scss'],
  standalone: false
})
export class ImpactCalculatorComponent implements OnChanges {
  @Input() action: ActionItem;

  impact: ActionImpact | null = null;
  amount = 0;
  times = 0;
  per: 'week' | 'month' | null = null;
  private static count = 0;
  readonly id = `impact-${++ImpactCalculatorComponent.count}`;

  ngOnChanges(): void {
    this.impact = validImpact(this.action?.impact);
    if (!this.impact) return;
    this.amount = this.impact.inputDefault;
    const frequency = defaultFrequency(this.action.repeatType);
    this.times = frequency?.times || 0;
    this.per = frequency?.per || null;
  }

  setAmount(value: string): void {
    this.amount = this.impact ? clampAmount(this.impact, Number(value)) : 0;
  }

  setTimes(value: string): void {
    const n = Math.round(Number(value));
    this.times = Number.isFinite(n) ? Math.min(Math.max(n, 0), MAX_TIMES) : 0;
  }

  get perTime(): number {
    return this.impact ? impactValue(this.impact, this.amount) : 0;
  }

  get eachTime(): string {
    return this.impact ? formatImpact(this.impact, this.perTime) : '';
  }

  get eachTimeEquivalent(): string | null {
    return this.impact ? everydayEquivalent(this.impact, this.perTime) : null;
  }

  /** A month and a year at the chosen frequency; null for one-off actions. */
  get projection(): { month: string; year: string; yearEquivalent: string | null } | null {
    if (!this.impact || !this.per) return null;
    const { month, year } = projectImpact(this.perTime, { times: this.times, per: this.per });
    return { month: formatImpact(this.impact, month), year: formatImpact(this.impact, year), yearEquivalent: everydayEquivalent(this.impact, year) };
  }

  get sourceSite(): string | null {
    try {
      return this.impact?.source ? new URL(this.impact.source).hostname.replace(/^www\./, '') : null;
    } catch {
      return null;
    }
  }
}
