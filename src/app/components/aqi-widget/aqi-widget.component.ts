import { Component, OnInit } from '@angular/core';
import { AqiWidgetService } from '../../services/aqi-widget.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-aqi-widget',
  templateUrl: './aqi-widget.component.html',
  styleUrls: ['./aqi-widget.component.scss'],
  standalone: false
})
export class AqiWidgetComponent implements OnInit {
  majorLocations: string[];
  selectedLocation = 'mumbai';
  searchLocation: string;
  searchLocationClickedFlag = false;
  searchLocationTabSelect = false;
  showAqiScorecard = true;
  searchLocationResults;
  about = false;

  constructor(private aqiService: AqiWidgetService) {}

  ngOnInit() {
    this.majorLocations = ['mumbai', 'delhi', 'lucknow', 'bangalore'];
  }

  searchByLocation() {
    this.searchLocationResults = this.aqiService
      .search(this.searchLocation)
      .pipe(
        map((result) => {
          result.data.sort((a, b) => (+a.aqi > +b.aqi ? -1 : 1));
          return result;
        })
      );
    this.searchLocationClickedFlag = true;
    this.showAqiScorecard = false;
  }

  loadSearchLocationDiv() {
    this.searchLocationTabSelect = true;
    this.showAqiScorecard = false;
  }

  loadMajorCitiesDiv() {
    this.searchLocationTabSelect = false;
    this.showAqiScorecard = true;
  }

  expandLocationAqiDetails(locationUrl: string) {
    this.selectedLocation = locationUrl;
    this.searchLocationClickedFlag = false;
    this.showAqiScorecard = true;
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
