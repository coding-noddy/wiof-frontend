import { Component, OnInit, OnDestroy } from '@angular/core';

interface EnergyResult {
  kgsOfCO2: number;
  litresPetrol: number;
  litresDiesel: number;
  kmsByCar: number;
  kmsBySUV: number;
}

interface EnergyFact {
  text: string;
  source: string;
  url: string;
}

/**
 * Emission factors used:
 * - Grid CO2 factor: 0.82 kg CO2/kWh — CEA CO2 Baseline Database for Indian Power Sector
 * - Petrol CO2: 2.31 kg CO2/litre — IPCC 2019 Refinement to 2006 Guidelines
 * - Diesel CO2: 2.68 kg CO2/litre — IPCC 2019 Refinement to 2006 Guidelines
 * - Car mileage: 15 km/litre (India average petrol car)
 * - SUV mileage: 12 km/litre (India average diesel SUV)
 */
const CO2_PER_KWH    = 0.82;
const CO2_PER_PETROL = 2.31;
const CO2_PER_DIESEL = 2.68;
const KM_PER_L_CAR   = 15;
const KM_PER_L_SUV   = 12;

@Component({
  selector: 'app-energy-widget',
  templateUrl: './energy-widget.component.html',
  styleUrls: ['./energy-widget.component.scss']
})
export class EnergyWidgetComponent implements OnInit, OnDestroy {

  about = false;
  energyConsumption: number | null = null;
  selectedUnit = 'kWh';

  consumptionError = false;
  result: EnergyResult | null = null;

  // ── Verified facts ─────────────────────────────────────────
  currentFactIndex = 0;
  factExpanded = false;
  private factTimer: any;

  energyFacts: EnergyFact[] = [
    {
      text: 'India\'s renewable energy capacity crossed 200 GW in 2024, with solar alone contributing over 90 GW — making it the fastest-growing solar market in the world.',
      source: 'PIB, Govt. of India',
      url: 'https://pib.gov.in/FactsheetDetails.aspx?Id=149095'
    },
    {
      text: 'India has committed to achieving 500 GW of non-fossil electricity capacity by 2030 — a pledge made at COP26 in Glasgow.',
      source: 'MNRE, Govt. of India',
      url: 'https://mnre.gov.in/en/re-statistics-2024-25/'
    },
    {
      text: 'India surpassed the European Union to become the world\'s third-largest source of CO₂ emissions in 2023, driven largely by coal-fired power generation.',
      source: 'IEA CO₂ Emissions 2023',
      url: 'https://www.iea.org/reports/co2-emissions-in-2023/the-changing-landscape-of-global-emissions'
    },
    {
      text: 'India\'s per-capita electricity consumption was ~1,015 kWh in 2022-23 — roughly one-third of the global average of ~3,100 kWh per person.',
      source: 'Ministry of Power / IEA',
      url: 'https://www.iea.org/countries/india'
    },
    {
      text: 'India hit its COP26 goal of 50% non-fossil power capacity five years ahead of schedule, crossing the mark in June 2025.',
      source: 'Newsonair, Govt. of India',
      url: 'https://newsonair.gov.in/india-achieves-50-non-fossil-power-capacity-five-years-ahead-of-target/'
    },
  ];

  get currentFact(): EnergyFact {
    return this.energyFacts[this.currentFactIndex];
  }

  ngOnInit() {
    this.startFactRotation();
  }

  ngOnDestroy() {
    this.stopFactRotation();
  }

  calculate() {
    this.consumptionError = false;
    this.result = null;

    const val = Number(this.energyConsumption);
    if (!this.energyConsumption || isNaN(val) || val <= 0) {
      this.consumptionError = true;
      return;
    }

    const kgsOfCO2 = val * CO2_PER_KWH;
    this.result = {
      kgsOfCO2,
      litresPetrol: kgsOfCO2 / CO2_PER_PETROL,
      litresDiesel: kgsOfCO2 / CO2_PER_DIESEL,
      kmsByCar:    (kgsOfCO2 / CO2_PER_PETROL) * KM_PER_L_CAR,
      kmsBySUV:    (kgsOfCO2 / CO2_PER_DIESEL) * KM_PER_L_SUV,
    };
  }

  reset() {
    this.energyConsumption = null;
    this.result = null;
    this.consumptionError = false;
  }

  nextFact() {
    this.currentFactIndex = (this.currentFactIndex + 1) % this.energyFacts.length;
    this.factExpanded = false;
    this.restartFactTimer();
  }

  prevFact() {
    this.currentFactIndex =
      (this.currentFactIndex - 1 + this.energyFacts.length) % this.energyFacts.length;
    this.factExpanded = false;
    this.restartFactTimer();
  }

  private startFactRotation() {
    this.factTimer = setInterval(() => {
      this.currentFactIndex = (this.currentFactIndex + 1) % this.energyFacts.length;
      this.factExpanded = false;
    }, 6000);
  }

  private stopFactRotation() {
    if (this.factTimer) clearInterval(this.factTimer);
  }

  private restartFactTimer() {
    this.stopFactRotation();
    this.startFactRotation();
  }

  get co2Level(): { label: string; color: string } {
    if (!this.result) return { label: '', color: '' };
    const kg = this.result.kgsOfCO2;
    if (kg < 50)   return { label: 'Low',      color: '#2e7d32' };
    if (kg < 200)  return { label: 'Moderate', color: '#f57f17' };
    if (kg < 500)  return { label: 'High',     color: '#e65100' };
    return           { label: 'Very High',     color: '#b71c1c' };
  }

  get co2BarWidth(): string {
    if (!this.result) return '0%';
    return Math.min((this.result.kgsOfCO2 / 1000) * 100, 100) + '%';
  }
}

