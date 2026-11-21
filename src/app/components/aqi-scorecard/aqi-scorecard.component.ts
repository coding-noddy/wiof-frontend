import { Component, Input, OnChanges } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AqiWidgetService } from '../../services/aqi-widget.service';

/** One reading in the grid: a pollutant's sub-index, or a weather measurement. */
export interface AqiParam {
  code: string;
  label: string;
  value: number;
  /** "AQI" for pollutants (WAQI's iaqi is the US EPA sub-index, not µg/m³); a real unit for weather. */
  unit: string;
  pollutant: boolean;
  suspicious: boolean;
}

export interface AqiView {
  aqi: number | null;
  city: string;
  dominant: string;
  /** When the station measured it, e.g. "Updated 21 Nov, 3:00 pm (station time)". */
  updated: string;
  /** Pollutants first, then weather. */
  params: AqiParam[];
  /** The original data source(s) WAQI credits (CPCB, a city board…), first ones only. */
  sources: { name: string; url: string }[];
}

const POLLUTANTS: Record<string, string> = { pm25: 'PM2.5', pm10: 'PM10', o3: 'Ozone (O₃)', no2: 'NO₂', so2: 'SO₂', co: 'CO' };
const WEATHER: Record<string, { label: string; unit: string }> = {
  t: { label: 'Temp', unit: '°C' },
  h: { label: 'Humidity', unit: '%' },
  w: { label: 'Wind', unit: 'm/s' },
  wg: { label: 'Wind Gust', unit: 'm/s' },
  p: { label: 'Pressure', unit: 'hPa' },
  dew: { label: 'Dew Point', unit: '°C' }
};

/** Obviously wrong readings (a broken sensor), shown as N/A. */
export function isValueSuspicious(code: string, value: number): boolean {
  if (typeof value !== 'number' || !isFinite(value)) return true;
  if (code === 't' && (value < -10 || value > 55)) return true;
  if (code === 'w' && value > 40) return true;
  if (code === 'h' && (value < 0 || value > 100)) return true;
  if (POLLUTANTS[code] && (value < 0 || value > 999)) return true;
  return false;
}

/** WAQI's feed response → what the card shows. Pure, so it's computed once per response, not on every check. */
export function toAqiView(data: any): AqiView {
  const iaqi = (data && data.iaqi) || {};
  const params: AqiParam[] = Object.entries(iaqi)
    .filter(([code]) => POLLUTANTS[code] || WEATHER[code])
    .map(([code, v]: [string, any]) => {
      const value = Number(v && v.v);
      const pollutant = !!POLLUTANTS[code];
      return {
        code,
        label: pollutant ? POLLUTANTS[code] : WEATHER[code].label,
        value,
        unit: pollutant ? 'AQI' : WEATHER[code].unit,
        pollutant,
        suspicious: isValueSuspicious(code, value)
      };
    })
    .sort((a, b) => Number(b.pollutant) - Number(a.pollutant));
  const aqi = Number(data && data.aqi);
  const t = data && data.time;
  let updated = '';
  if (t && t.s) {
    // WAQI gives the station's local time ("2026-11-21 15:00:00") with its offset; show it as the station's own time.
    const [d, hm] = String(t.s).split(' ');
    const date = new Date(`${d}T${hm || '00:00:00'}Z`);
    if (!isNaN(date.getTime())) {
      updated = `Updated ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}, ${date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })} (station time)`;
    }
  }
  const sources = (Array.isArray(data && data.attributions) ? data.attributions : [])
    .filter((a: any) => a && a.name && !/World Air Quality Index/i.test(a.name))
    .slice(0, 2)
    .map((a: any) => ({ name: String(a.name), url: String(a.url || '') }));
  return {
    aqi: isFinite(aqi) ? aqi : null,
    city: (data && data.city && data.city.name) || '',
    dominant: (data && data.dominentpol) || '',
    updated,
    params,
    sources
  };
}

@Component({
  selector: 'app-aqi-scorecard',
  templateUrl: './aqi-scorecard.component.html',
  styleUrls: ['./aqi-scorecard.component.scss'],
  standalone: false
})
export class AqiScorecardComponent implements OnChanges {
  @Input() locationUrl!: string;
  aqiData$!: Observable<AqiView>;

  constructor(private aqiService: AqiWidgetService) {}

  ngOnChanges() {
    this.aqiData$ = this.aqiService.getAqi(this.locationUrl).pipe(map((response: any) => toAqiView(response.data)));
  }

  /** US EPA AQI bands (WAQI's scale): 0–50, 51–100, 101–150, 151–200, 201–300, 301+. */
  aqiColor(aqi: number | null): string {
    if (aqi === null || aqi < 0) return 'aqi-na';
    if (aqi <= 50) return 'aqi-good';
    if (aqi <= 100) return 'aqi-moderate';
    if (aqi <= 150) return 'aqi-unhealthy-for-sensitive';
    if (aqi <= 200) return 'aqi-unhealthy';
    if (aqi <= 300) return 'aqi-very-unhealthy';
    return 'aqi-hazardous';
  }

  aqiLabel(aqi: number | null): string {
    return { 'aqi-good': 'Good', 'aqi-moderate': 'Moderate', 'aqi-unhealthy-for-sensitive': 'Sensitive Groups', 'aqi-unhealthy': 'Unhealthy', 'aqi-very-unhealthy': 'Very Unhealthy', 'aqi-hazardous': 'Hazardous', 'aqi-na': 'N/A' }[this.aqiColor(aqi)]!;
  }

  getAdvice(aqi: number | null): string {
    return {
      'aqi-good': 'Air quality is satisfactory. Enjoy outdoor activities!',
      'aqi-moderate': 'Acceptable air quality. Sensitive individuals should limit prolonged outdoor exertion.',
      'aqi-unhealthy-for-sensitive': 'Members of sensitive groups may experience health effects. General public less likely to be affected.',
      'aqi-unhealthy': 'Everyone may begin to experience health effects. Sensitive groups more serious effects.',
      'aqi-very-unhealthy': 'Health alert: everyone may experience serious health effects. Avoid outdoor activity.',
      'aqi-hazardous': 'Health emergency! The entire population is likely to be affected. Stay indoors.',
      'aqi-na': 'AQI data unavailable for this location.'
    }[this.aqiColor(aqi)]!;
  }

  getAdviceIcon(aqi: number | null): string {
    if (aqi === null || aqi <= 100) return 'checkmark-circle-outline';
    if (aqi <= 200) return 'warning-outline';
    return 'alert-circle-outline';
  }
}
