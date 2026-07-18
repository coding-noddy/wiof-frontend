import { Component, OnInit, OnDestroy } from '@angular/core';
import { AqiWidgetService } from '../../services/aqi-widget.service';
import { Subject } from 'rxjs';
import { map, debounceTime, switchMap, takeUntil, filter } from 'rxjs/operators';

interface AQIFact {
  text: string;
  source: string;
  url: string;
}

@Component({
  selector: 'app-aqi-widget',
  templateUrl: './aqi-widget.component.html',
  styleUrls: ['./aqi-widget.component.scss']
})
export class AqiWidgetComponent implements OnInit, OnDestroy {

  majorLocations = ['mumbai', 'delhi', 'lucknow', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 'pune'];
  selectedLocation = 'mumbai';
  searchLocation = '';
  searchLocationClickedFlag = false;
  searchLocationResults: any;
  searchLoading = false;
  showAqiScorecard = true;
  showSearch = false;
  about = false;

  private searchInput$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  // ── Fact strip ─────────────────────────────────────────────
  currentFactIndex = 0;
  factExpanded = false;
  private factTimer: ReturnType<typeof setInterval> | null = null;

  aqiFacts: AQIFact[] = [
    {
      text: 'Delhi\'s average AQI during winter months often exceeds 300 (Hazardous) — making it one of the most polluted cities globally during November-January.',
      source: 'CPCB India',
      url: 'https://cpcb.nic.in/national-air-quality-index/'
    },
    {
      text: 'WHO estimates 99% of the global population breathes air that exceeds WHO guideline limits for pollutants like PM2.5.',
      source: 'World Health Organization',
      url: 'https://www.who.int/health-topics/air-pollution'
    },
    {
      text: 'India launched the National Clean Air Programme (NCAP) in 2019, targeting a 40% reduction in PM2.5/PM10 concentrations by 2025-26 across 131 cities.',
      source: 'Ministry of Environment, India',
      url: 'https://moef.gov.in/en/service/environment/ncap/'
    },
    {
      text: 'AQI between 0-50 is "Good" — safe for all. Above 200 is "Very Unhealthy" and above 300 is "Hazardous", requiring everyone to avoid outdoor activity.',
      source: 'World Air Quality Index Project',
      url: 'https://waqi.info/scale/'
    },
  ];

  get currentFact(): AQIFact {
    return this.aqiFacts[this.currentFactIndex];
  }

  constructor(private aqiService: AqiWidgetService) {}

  ngOnInit() {
    this.startFactRotation();

    // Auto-search as user types (debounced)
    this.searchInput$.pipe(
      debounceTime(400),
      filter(q => q.trim().length >= 2),
      switchMap(query => {
        this.searchLoading = true;
        this.searchLocationClickedFlag = true;
        this.showAqiScorecard = false;
        return this.aqiService.search(query).pipe(
          map((result: any) => {
            result.data.sort((a: any, b: any) => (+a.aqi > +b.aqi ? -1 : 1));
            return result;
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      this.searchLocationResults = result;
      this.searchLoading = false;
    });
  }

  ngOnDestroy() {
    this.stopFactRotation();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Search ─────────────────────────────────────────────────
  onSearchInput(query: string) {
    this.searchLocation = query;
    if (query.trim().length < 2) {
      this.searchLocationClickedFlag = false;
      this.searchLocationResults = null;
      return;
    }
    this.searchInput$.next(query);
  }

  expandLocationAqiDetails(locationUrl: string) {
    this.selectedLocation = locationUrl;
    this.searchLocationClickedFlag = false;
    this.showAqiScorecard = true;
    this.showSearch = false;
    this.searchLocation = '';
  }

  // ── AQI color logic ────────────────────────────────────────
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
    if (aqi >= 101 && aqi < 151) return 'Unhealthy for Sensitive';
    if (aqi >= 151 && aqi < 201) return 'Unhealthy';
    if (aqi >= 201 && aqi < 300) return 'Very Unhealthy';
    if (aqi >= 300) return 'Hazardous';
    return 'N/A';
  }

  // ── Fact strip ─────────────────────────────────────────────
  nextFact() {
    this.currentFactIndex = (this.currentFactIndex + 1) % this.aqiFacts.length;
    this.factExpanded = false;
    this.restartFactTimer();
  }

  prevFact() {
    this.currentFactIndex =
      (this.currentFactIndex - 1 + this.aqiFacts.length) % this.aqiFacts.length;
    this.factExpanded = false;
    this.restartFactTimer();
  }

  private startFactRotation() {
    this.factTimer = setInterval(() => {
      this.currentFactIndex = (this.currentFactIndex + 1) % this.aqiFacts.length;
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
}
