import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { Observable } from 'rxjs';
import { AqiWidgetService } from '../../services/aqi-widget.service';
import { AqiResponseData } from '../../models/Aqi';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-aqi-scorecard',
  templateUrl: './aqi-scorecard.component.html',
  styleUrls: ['./aqi-scorecard.component.scss'],
  standalone: false
})
export class AqiScorecardComponent implements OnInit {
  @Input() locationUrl: string;
  aqiData$: Observable<AqiResponseData>;

  constructor(private aqiService: AqiWidgetService) {}

  ngOnInit() {}

  getAqiParameters(iaqi: any) {
    return Object.entries(iaqi) as Array<[string, { v: number }]>;
  }

  ngOnChanges() {
    this.aqiData$ = this.aqiService
      .getAqi(this.locationUrl)
      .pipe(map((response) => response.data));
  }

  aqiColor(aqi: number) {
    let aqiLevelClass = 'aqi-level-card ';
    if (aqi > 0 && aqi < 51) {
      aqiLevelClass += 'aqi-good';
    } else if (aqi > 50 && aqi < 101) {
      aqiLevelClass += 'aqi-moderate';
    } else if (aqi > 100 && aqi < 151) {
      aqiLevelClass += 'aqi-unhealthy-for-sensitive';
    } else if (aqi > 150 && aqi < 201) {
      aqiLevelClass += 'aqi-unhealthy';
    } else if (aqi > 200 && aqi < 300) {
      aqiLevelClass += 'aqi-very-unhealthy';
    } else if (aqi > 300) {
      aqiLevelClass += 'aqi-hazardous';
    } else {
      aqiLevelClass += 'aqi-na';
    }
    return aqiLevelClass;
  }
}
