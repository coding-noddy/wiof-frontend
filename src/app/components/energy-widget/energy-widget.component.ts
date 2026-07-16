import { Component, OnInit } from '@angular/core';

interface EnergyResult {
  kgsOfCO2: number;
  litresPetrol: number;
  litresDiesel: number;
  kmsByCar: number;
  kmsBySUV: number;
}

/**
 * Emission factors used:
 * - Grid CO2 factor: 0.82 kg CO2/kWh — CEA CO2 Baseline Database for Indian Power Sector
 *   Source: https://cea.nic.in/cdm-co2-baseline-database/
 * - Petrol CO2: 2.31 kg CO2/litre — IPCC 2006 Guidelines for National GHG Inventories
 * - Diesel CO2: 2.68 kg CO2/litre — IPCC 2006 Guidelines for National GHG Inventories
 * - Car mileage: 15 km/litre (India average petrol car)
 * - SUV mileage: 12 km/litre (India average diesel SUV)
 */

const CO2_PER_KWH    = 0.82;   // kg CO2/kWh — CEA India grid emission factor
const CO2_PER_PETROL = 2.31;   // kg CO2/litre — IPCC
const CO2_PER_DIESEL = 2.68;   // kg CO2/litre — IPCC
const KM_PER_L_CAR   = 15;     // km/litre — India avg petrol car
const KM_PER_L_SUV   = 12;     // km/litre — India avg diesel SUV

@Component({
  selector: 'app-energy-widget',
  templateUrl: './energy-widget.component.html',
  styleUrls: ['./energy-widget.component.scss']
})
export class EnergyWidgetComponent implements OnInit {

  about = false;
  energyConsumption: number | null = null;
  // kWh is the only scientifically correct unit for energy consumption
  // kW is power (rate), not energy — cannot be used directly for CO2 calculation
  units = ['kWh'];
  selectedUnit = 'kWh';

  consumptionError = false;
  result: EnergyResult | null = null;

  ngOnInit() {}

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

  get co2Level(): { label: string; color: string } {
    if (!this.result) return { label: '', color: '' };
    const kg = this.result.kgsOfCO2;
    if (kg < 50)   return { label: 'Low',       color: '#2e7d32' };
    if (kg < 200)  return { label: 'Moderate',  color: '#f57f17' };
    if (kg < 500)  return { label: 'High',      color: '#e65100' };
    return           { label: 'Very High',      color: '#b71c1c' };
  }

  get co2BarWidth(): string {
    if (!this.result) return '0%';
    return Math.min((this.result.kgsOfCO2 / 1000) * 100, 100) + '%';
  }
}

