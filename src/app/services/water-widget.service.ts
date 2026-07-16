import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ENDPOINTS } from '../app.constants';

export interface RainfallData {
  city: string;
  precipitationToday: number;   // mm today
  precipitationUnit: string;
  fetchedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class WaterWidgetService {

  constructor(private http: HttpClient) {}

  /**
   * Fetches today's precipitation sum for a given lat/lon via Open-Meteo.
   * No API key required. Free for non-commercial use.
   * Docs: https://open-meteo.com/en/docs
   */
  getRainfall(lat: number, lon: number, cityName: string): Observable<RainfallData> {
    const params = new HttpParams()
      .set('latitude', lat.toString())
      .set('longitude', lon.toString())
      .set('daily', 'precipitation_sum')
      .set('forecast_days', '1')
      .set('timezone', 'Asia/Kolkata');

    return this.http.get<any>(ENDPOINTS.OPEN_METEO, { params }).pipe(
      map(res => ({
        city: cityName,
        precipitationToday: res?.daily?.precipitation_sum?.[0] ?? 0,
        precipitationUnit: res?.daily_units?.precipitation_sum ?? 'mm',
        fetchedAt: new Date()
      }))
    );
  }
}
