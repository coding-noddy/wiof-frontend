import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { Observable } from 'rxjs';
import { AqiWidgetService } from '../../services/aqi-widget.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-aqi-scorecard',
  templateUrl: './aqi-scorecard.component.html',
  styleUrls: ['./aqi-scorecard.component.scss']
})
export class AqiScorecardComponent implements OnInit, OnChanges {
  @Input() locationUrl!: string;
  aqiData$!: Observable<any>;

  // Human-readable labels for pollutant codes
  private paramLabels: Record<string, string> = {
    pm25: 'PM2.5',
    pm10: 'PM10',
    o3: 'Ozone (O₃)',
    no2: 'NO₂',
    so2: 'SO₂',
    co: 'CO',
    t: 'Temp',
    w: 'Wind',
    h: 'Humidity',
    p: 'Pressure',
    dew: 'Dew Point',
    wg: 'Wind Gust',
  };

  private paramUnits: Record<string, string> = {
    pm25: 'µg/m³',
    pm10: 'µg/m³',
    o3: 'ppb',
    no2: 'ppb',
    so2: 'ppb',
    co: 'ppm',
    t: '°C',
    w: 'm/s',
    h: '%',
    p: 'hPa',
    dew: '°C',
    wg: 'm/s',
  };

  constructor(private aqiService: AqiWidgetService) {}

  ngOnInit() {}

  ngOnChanges() {
    this.aqiData$ = this.aqiService
      .getAqi(this.locationUrl)
      .pipe(map((response: any) => response.data));
  }

  getAqiParameters(iaqi: any): Array<[string, { v: number }]> {
    if (!iaqi) return [];
    return Object.entries(iaqi) as Array<[string, { v: number }]>;
  }

  getParameterLabel(code: string): string {
    return this.paramLabels[code] || code.toUpperCase();
  }

  getParameterUnit(code: string): string {
    return this.paramUnits[code] || '';
  }

  /** Flag obviously incorrect values (e.g. negative temperature in tropical cities) */
  isValueSuspicious(code: string, value: number): boolean {
    if (code === 't' && (value < -10 || value > 55)) return true;  // temperature sanity
    if (code === 'w' && value > 40) return true;  // wind > 144 km/h is extreme
    if (code === 'h' && (value < 0 || value > 100)) return true;  // humidity %
    return false;
  }

  aqiColor(aqi: number): string {
    if (aqi > 0 && aqi < 51) return 'aqi-good';
    if (aqi >= 51 && aqi < 101) return 'aqi-moderate';
    if (aqi >= 101 && aqi < 151) return 'aqi-unhealthy-for-sensitive';
    if (aqi >= 151 && aqi < 201) return 'aqi-unhealthy';
    if (aqi >= 201 && aqi < 300) return 'aqi-very-unhealthy';
    if (aqi >= 300) return 'aqi-hazardous';
    return 'aqi-na';
  }

  aqiLabel(aqi: number): string {
    if (aqi > 0 && aqi < 51) return 'Good';
    if (aqi >= 51 && aqi < 101) return 'Moderate';
    if (aqi >= 101 && aqi < 151) return 'Sensitive Groups';
    if (aqi >= 151 && aqi < 201) return 'Unhealthy';
    if (aqi >= 201 && aqi < 300) return 'Very Unhealthy';
    if (aqi >= 300) return 'Hazardous';
    return 'N/A';
  }

  getAdvice(aqi: number): string {
    if (aqi > 0 && aqi < 51) return 'Air quality is satisfactory. Enjoy outdoor activities!';
    if (aqi >= 51 && aqi < 101) return 'Acceptable air quality. Sensitive individuals should limit prolonged outdoor exertion.';
    if (aqi >= 101 && aqi < 151) return 'Members of sensitive groups may experience health effects. General public less likely to be affected.';
    if (aqi >= 151 && aqi < 201) return 'Everyone may begin to experience health effects. Sensitive groups more serious effects.';
    if (aqi >= 201 && aqi < 300) return 'Health alert: everyone may experience serious health effects. Avoid outdoor activity.';
    if (aqi >= 300) return 'Health emergency! The entire population is likely to be affected. Stay indoors.';
    return 'AQI data unavailable for this location.';
  }

  getAdviceIcon(aqi: number): string {
    if (aqi < 101) return 'checkmark-circle-outline';
    if (aqi < 201) return 'warning-outline';
    return 'alert-circle-outline';
  }
}
