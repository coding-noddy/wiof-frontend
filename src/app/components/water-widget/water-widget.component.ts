import { Component, OnInit, OnDestroy } from '@angular/core';
import { WaterWidgetService, RainfallData } from '../../services/water-widget.service';
import { INDIAN_CITIES } from '../../app.constants';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

interface WaterItem {
  name: string;
  icon: string;
  url: string;
  category: 'availability' | 'quality' | 'climate';
}

interface WaterFact {
  text: string;
  source: string;
  url: string;
}

interface City {
  name: string;
  lat: number;
  lon: number;
}

@Component({
  selector: 'app-water-widget',
  templateUrl: './water-widget.component.html',
  styleUrls: ['./water-widget.component.scss']
})
export class WaterWidgetComponent implements OnInit, OnDestroy {

  about = false;
  activeCategory: 'all' | 'availability' | 'quality' | 'climate' = 'all';
  lastVisitedKey = 'wiof_water_last_visited';
  lastVisited: string | null = null;
  currentFactIndex = 0;
  factExpanded = false;
  private factTimer: ReturnType<typeof setInterval> | null = null;
  private destroy$ = new Subject<void>();

  // ── Rainfall live data ─────────────────────────────────────
  cities: City[] = INDIAN_CITIES;
  selectedCity: City = INDIAN_CITIES[0];   // default: Mumbai
  rainfall: RainfallData | null = null;
  rainfallLoading = false;
  rainfallError = false;

  // ── City search ────────────────────────────────────────────
  citySearchQuery = '';
  citySearchResults: City[] = [];
  citySearching = false;
  showCitySearch = false;
  private citySearch$ = new Subject<string>();

  // ── Verified facts with official citations only ────────────
  waterFacts: WaterFact[] = [
    {
      text: 'India holds ~18% of the world\'s population but has access to only ~4% of its freshwater resources.',
      source: 'World Bank',
      url: 'https://www.worldbank.org/en/news/feature/2011/09/29/india-water'
    },
    {
      text: 'Over 60% of India\'s irrigated agriculture and 85% of drinking water supplies depend on groundwater.',
      source: 'CGWB / World Bank',
      url: 'https://cgwb.gov.in/en/aquifer-mapping-management'
    },
    {
      text: 'The Ganga basin supports more than 400 million people — one of the most populous river basins on Earth.',
      source: 'World Bank',
      url: 'https://www.worldbank.org/en/news/feature/2011/05/27/india-ganga-river-basin-faq'
    },
    {
      text: 'India\'s per capita water availability has fallen from 5,177 m³ in 1951 to ~1,545 m³ in 2011, and is still declining.',
      source: 'WHO India',
      url: 'https://www.who.int/india/news/feature-stories/detail/tap-water-at-home-lowers-disease-saves-time-and-labour'
    },
    {
      text: 'Around 600 million Indians face high to extreme water stress — NITI Aayog\'s Composite Water Management Index.',
      source: 'NITI Aayog CWMI',
      url: 'https://www.worldbank.org/en/country/india/brief/how-india-is-addressing-its-water-needs'
    },
  ];

  categories = [
    { key: 'all',          label: 'All',         icon: 'apps-outline' },
    { key: 'availability', label: 'Availability', icon: 'water-outline' },
    { key: 'quality',      label: 'Quality',      icon: 'flask-outline' },
    { key: 'climate',      label: 'Climate',      icon: 'cloud-outline' },
  ] as const;

  allItems: WaterItem[] = [
    {
      name: 'Ground Water',
      icon: '../../../assets/water-widget-icons/icons ground water.png',
      url: 'https://indiawris.gov.in/wris/#/groundWater',
      category: 'availability'
    },
    {
      name: 'Rainfall',
      icon: '../../../assets/water-widget-icons/icons rainfall.png',
      url: 'https://indiawris.gov.in/wris/#/rainfall',
      category: 'availability'
    },
    {
      name: 'Reservoirs',
      icon: '../../../assets/water-widget-icons/icons reservoir.png',
      url: 'https://indiawris.gov.in/wris/#/Reservoirs',
      category: 'availability'
    },
    {
      name: 'River',
      icon: '../../../assets/water-widget-icons/icons river.png',
      url: 'https://indiawris.gov.in/wris/#/RiverMonitoring',
      category: 'availability'
    },
    {
      name: 'Surface Water Quality',
      icon: '../../../assets/water-widget-icons/icon surface water quality.png',
      url: 'https://indiawris.gov.in/wris/#/SWQuality',
      category: 'quality'
    },
    {
      name: 'Soil Moisture',
      icon: '../../../assets/water-widget-icons/icons soil moisture.png',
      url: 'https://indiawris.gov.in/wris/#/soilMoisture',
      category: 'quality'
    },
    {
      name: 'Evapo-Transpiration',
      icon: '../../../assets/water-widget-icons/icons8-sparkling_water 1.png',
      url: 'https://indiawris.gov.in/wris/#/evapotranspiration',
      category: 'climate'
    },
  ];

  get filteredItems(): WaterItem[] {
    if (this.activeCategory === 'all') return this.allItems;
    return this.allItems.filter(i => i.category === this.activeCategory);
  }

  get currentFact(): WaterFact {
    return this.waterFacts[this.currentFactIndex];
  }

  /** Returns a human-friendly description of today's rainfall */
  get rainfallDescription(): string {
    if (!this.rainfall) return '';
    const mm = this.rainfall.precipitationToday;
    if (mm === 0)        return 'No rainfall today';
    if (mm < 2.5)        return 'Light rain today';
    if (mm < 7.5)        return 'Moderate rain today';
    if (mm < 35.5)       return 'Heavy rain today';
    return 'Very heavy rain today';
  }

  /** Rainfall bar fill: capped at 50mm for visual purposes */
  get rainfallBarWidth(): string {
    if (!this.rainfall) return '0%';
    return Math.min((this.rainfall.precipitationToday / 50) * 100, 100) + '%';
  }

  /** Color based on intensity */
  get rainfallBarColor(): string {
    if (!this.rainfall) return '#90caf9';
    const mm = this.rainfall.precipitationToday;
    if (mm === 0)   return '#b0bec5';
    if (mm < 7.5)   return '#4fc3f7';
    if (mm < 35.5)  return '#0288d1';
    return '#01579b';
  }

  constructor(
    private waterWidgetService: WaterWidgetService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.lastVisited = localStorage.getItem(this.lastVisitedKey);
    this.startFactRotation();
    this.fetchRainfall();

    // City search pipeline — debounce + geocoding API
    this.citySearch$.pipe(
      debounceTime(400),
      switchMap(query => {
        if (!query || query.length < 2) {
          this.citySearchResults = [];
          this.citySearching = false;
          return [];
        }
        this.citySearching = true;
        return this.http.get<any>(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      this.citySearching = false;
      if (res?.results) {
        this.citySearchResults = res.results.map((r: any) => ({
          name: `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}${r.country ? ' (' + r.country + ')' : ''}`,
          lat: r.latitude,
          lon: r.longitude
        }));
      } else {
        this.citySearchResults = [];
      }
    });
  }

  ngOnDestroy() {
    this.stopFactRotation();
    this.destroy$.next();
    this.destroy$.complete();
  }

  setCategory(cat: 'all' | 'availability' | 'quality' | 'climate') {
    this.activeCategory = cat;
  }

  onItemClick(item: WaterItem) {
    localStorage.setItem(this.lastVisitedKey, item.name);
    this.lastVisited = item.name;
  }

  isLastVisited(item: WaterItem): boolean {
    return this.lastVisited === item.name;
  }

  compareCities(a: City, b: City): boolean {
    return a && b && a.name === b.name;
  }

  onCityChange(city: City) {
    this.selectedCity = city;
    this.fetchRainfall();
  }

  // ── City search methods ────────────────────────────────────
  onCitySearchInput(query: string) {
    this.citySearchQuery = query;
    this.citySearch$.next(query);
  }

  selectSearchedCity(city: City) {
    // Check if this city matches one in our preset dropdown
    const presetMatch = this.cities.find(c =>
      c.name.toLowerCase() === city.name.split(',')[0].trim().toLowerCase()
    );

    if (presetMatch) {
      this.selectedCity = presetMatch;
    } else {
      // Add to cities list temporarily so dropdown reflects the selection
      this.selectedCity = city;
      // Ensure dropdown shows the custom city
      if (!this.cities.find(c => c.name === city.name)) {
        this.cities = [city, ...INDIAN_CITIES];
      }
    }

    this.showCitySearch = false;
    this.citySearchQuery = '';
    this.citySearchResults = [];
    this.fetchRainfall();
  }

  toggleCitySearch() {
    this.showCitySearch = !this.showCitySearch;
    if (!this.showCitySearch) {
      this.citySearchQuery = '';
      this.citySearchResults = [];
    }
  }

  fetchRainfall() {
    this.rainfallLoading = true;
    this.rainfallError = false;
    this.rainfall = null;

    this.waterWidgetService
      .getRainfall(this.selectedCity.lat, this.selectedCity.lon, this.selectedCity.name)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.rainfall = data;
          this.rainfallLoading = false;
        },
        error: () => {
          this.rainfallError = true;
          this.rainfallLoading = false;
        }
      });
  }

  nextFact() {
    this.currentFactIndex = (this.currentFactIndex + 1) % this.waterFacts.length;
    this.factExpanded = false;
    this.restartFactTimer();
  }

  prevFact() {
    this.currentFactIndex =
      (this.currentFactIndex - 1 + this.waterFacts.length) % this.waterFacts.length;
    this.factExpanded = false;
    this.restartFactTimer();
  }

  private startFactRotation() {
    this.factTimer = setInterval(() => {
      this.currentFactIndex = (this.currentFactIndex + 1) % this.waterFacts.length;
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
