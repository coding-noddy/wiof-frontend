import { Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { Food, FoodDataService } from '../../services/food-data.service';

interface CategoryChip {
  key: string;
  label: string;
  emoji: string;
  matchCategories: string[]; // CSV categories this chip matches
}

interface PhFact {
  text: string;
  source: string;
  url: string;
}

@Component({
  selector: 'app-food-ph-indicator',
  templateUrl: './food-ph-indicator.component.html',
  styleUrls: ['./food-ph-indicator.component.scss']
})
export class FoodPhIndicatorComponent implements OnInit, OnDestroy {

  foodOptions: Food[] = [];
  filteredFoodOptions$!: Observable<Food[]>;
  selectedFood: Food | null = null;

  foodInputCtrl = new FormControl('');

  about = false;
  showDetails = false;
  activeCategory = 'all';
  showCategoryDropdown = false;

  // ── Category chips ─────────────────────────────────────────
  categoryChips: CategoryChip[] = [
    { key: 'all',       label: 'All',         emoji: '🔍', matchCategories: [] },
    { key: 'fruit',     label: 'Fruits',      emoji: '🍎', matchCategories: ['Fruit'] },
    { key: 'veg',       label: 'Vegetables',  emoji: '🥦', matchCategories: ['Vegetable'] },
    { key: 'dairy',     label: 'Dairy',       emoji: '🥛', matchCategories: ['Dairy', 'Plant-Based Dairy Alternative'] },
    { key: 'grain',     label: 'Grains',      emoji: '🌾', matchCategories: ['Grain', 'Rice & Breakfast Foods', 'Pasta & Noodles'] },
    { key: 'protein',   label: 'Protein',     emoji: '🍗', matchCategories: ['Meat & Poultry', 'Seafood', 'Egg', 'Legume', 'Plant-Based Protein'] },
    { key: 'nuts',      label: 'Nuts & Seeds',emoji: '🌰', matchCategories: ['Nut', 'Seed'] },
    { key: 'beverage',  label: 'Beverages',   emoji: '🍵', matchCategories: ['Beverage'] },
    { key: 'other',     label: 'Other',       emoji: '🌶️', matchCategories: ['Spice', 'Herb', 'Condiment', 'Condiments & Sauces', 'Bakery', 'Prepared Foods', 'Plant-Based Foods', 'Other'] },
  ];

  // ── Category-level health tips ─────────────────────────────
  categoryHealthTips: Record<string, string> = {
    'Fruit': 'Fruits become less acidic as they ripen. Eating ripe fruits supports better digestion and nutrient absorption.',
    'Vegetable': 'Most vegetables are mildly acidic to neutral. Cooking can slightly increase pH — raw or lightly steamed retains maximum nutrients.',
    'Dairy': 'Fermented dairy (yogurt, kefir) is more acidic but contains beneficial probiotics. Fresh milk is close to neutral pH.',
    'Meat & Poultry': 'Meat is slightly acidic. Pairing with alkaline vegetables helps maintain dietary pH balance.',
    'Seafood': 'Fresh seafood is typically near neutral pH. Combining with citrus (acidic) aids iron absorption.',
    'Egg': 'Egg whites are one of the few naturally alkaline foods. Whole eggs become slightly more alkaline when cooked.',
    'Legume': 'Cooked legumes are mildly acidic to neutral. Soaking before cooking reduces phytic acid and improves digestibility.',
    'Grain': 'Whole grains are mildly acidic. Soaking or fermenting (like sourdough) can reduce acidity and improve mineral availability.',
    'Nut': 'Most nuts are mildly acidic. Soaking raw nuts overnight can reduce enzyme inhibitors and improve digestibility.',
    'Seed': 'Seeds are generally near-neutral. Sprouting seeds increases their alkalinity and nutrient bioavailability.',
    'Beverage': 'Coffee and tea are acidic. Adding milk slightly raises pH. Herbal teas tend to be less acidic than black tea.',
    'Spice': 'Spices like turmeric and cinnamon have mild pH but offer anti-inflammatory benefits beyond their acidity.',
    'Herb': 'Fresh herbs are generally near-neutral pH and add flavor without significantly affecting dietary acid load.',
    'Condiment': 'Vinegar-based condiments are highly acidic — use in moderation. Fermented condiments support gut health.',
    'Condiments & Sauces': 'Vinegar-based sauces are highly acidic — use in moderation. Fermented condiments support gut health.',
  };

  // Default tip when category doesn't have a specific one
  defaultHealthTip = 'A balanced diet with a mix of acidic and alkaline foods supports optimal body pH and overall health.';

  // ── Emoji map for dropdown ─────────────────────────────────
  categoryEmoji: Record<string, string> = {
    'Fruit': '🍎',
    'Vegetable': '🥦',
    'Dairy': '🥛',
    'Grain': '🌾',
    'Meat & Poultry': '🍗',
    'Seafood': '🐟',
    'Egg': '🥚',
    'Legume': '🫘',
    'Nut': '🌰',
    'Seed': '🫘',
    'Beverage': '🍵',
    'Spice': '🌶️',
    'Herb': '🌿',
    'Condiment': '🫙',
    'Condiments & Sauces': '🫙',
    'Bakery': '🍞',
    'Prepared Foods': '🍲',
    'Plant-Based Protein': '🌱',
    'Plant-Based Dairy Alternative': '🥥',
    'Plant-Based Foods': '🌱',
    'Pasta & Noodles': '🍜',
    'Rice & Breakfast Foods': '🍚',
    'Other': '🍽️'
  };

  // ── Verified pH/nutrition facts ────────────────────────────
  currentFactIndex = 0;
  factExpanded = false;
  private factTimer: any;

  phFacts: PhFact[] = [
    {
      text: 'The human body maintains blood pH between 7.35-7.45. Diet cannot change blood pH, but can influence urine pH and overall metabolic load.',
      source: 'National Library of Medicine',
      url: 'https://pubmed.ncbi.nlm.nih.gov/22174002/'
    },
    {
      text: 'A diet rich in fruits and vegetables (even acidic ones like citrus) produces an alkaline metabolic effect due to their mineral content.',
      source: 'Journal of Environmental & Public Health',
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3195546/'
    },
    {
      text: 'Foods with pH below 4.6 are considered "high-acid" by the FDA and are naturally resistant to bacterial growth — this is why pickling preserves food.',
      source: 'FDA Food Safety',
      url: 'https://www.fda.gov/food/resources-you-food/acidified-and-low-acid-canned-foods'
    },
    {
      text: 'Cooking generally raises the pH of foods slightly. For example, raw tomatoes (pH 4.0-4.5) become less acidic when cooked into sauce.',
      source: 'Clemson University Food Science',
      url: 'https://www.clemson.edu/extension/food/_files/ph-of-common-foods-table.pdf'
    },
    {
      text: 'Egg whites are one of the few naturally alkaline foods (pH 8-9), while egg yolks are slightly acidic (pH ~6). The whole egg averages around pH 7.6.',
      source: 'USDA ARS',
      url: 'https://pmp.errc.ars.usda.gov/phOfSelectedFoods.aspx'
    },
  ];

  get currentFact(): PhFact {
    return this.phFacts[this.currentFactIndex];
  }

  @ViewChild('foodSearchInput')
  foodSearchInput!: ElementRef<HTMLInputElement>;

  constructor(private foodDataService: FoodDataService) {}

  ngOnInit(): void {
    this.foodDataService.getFoods().subscribe(
      foods => {
        this.foodOptions = foods;
        this.initializeAutocomplete();
      },
      error => {
        console.error('Failed to load food dataset.', error);
      }
    );
    this.startFactRotation();
  }

  ngOnDestroy(): void {
    this.stopFactRotation();
  }

  // ── Category filter ────────────────────────────────────────
  setCategory(chip: CategoryChip): void {
    this.activeCategory = chip.key;
    this.foodInputCtrl.setValue('');
    this.selectedFood = null;
    this.showDetails = false;
  }

  selectCategory(chip: CategoryChip): void {
    this.activeCategory = chip.key;
    this.showCategoryDropdown = false;
    this.foodInputCtrl.setValue('');
    this.selectedFood = null;
    this.showDetails = false;
    this.initializeAutocomplete();
  }

  getActiveCategoryEmoji(): string {
    const chip = this.categoryChips.find(c => c.key === this.activeCategory);
    return chip ? chip.emoji : '🔍';
  }

  getActiveCategoryLabel(): string {
    const chip = this.categoryChips.find(c => c.key === this.activeCategory);
    return chip ? chip.label : 'All';
  }

  onCategoryChange(): void {
    this.foodInputCtrl.setValue('');
    this.selectedFood = null;
    this.showDetails = false;
    this.initializeAutocomplete();
  }

  private getFilteredByCategory(): Food[] {
    if (this.activeCategory === 'all') return this.foodOptions;
    const chip = this.categoryChips.find(c => c.key === this.activeCategory);
    if (!chip) return this.foodOptions;
    return this.foodOptions.filter(f =>
      chip.matchCategories.includes(f.category)
    );
  }

  // ── Autocomplete ───────────────────────────────────────────
  private initializeAutocomplete(): void {
    this.filteredFoodOptions$ = this.foodInputCtrl.valueChanges.pipe(
      startWith(''),
      map(value => typeof value === 'string' ? value : (value as any)?.name ?? ''),
      map(name => {
        const baseList = this.getFilteredByCategory();
        if (!name) return baseList; // show all items in category
        return this.filterFromList(baseList, name);
      })
    );
  }

  private filterFromList(list: Food[], searchText: string): Food[] {
    const search = searchText.trim().toLowerCase();
    return list.filter(food =>
      food.name.toLowerCase().includes(search) ||
      food.scientificName.toLowerCase().includes(search) ||
      food.category.toLowerCase().includes(search)
    );
  }

  // ── Random food ────────────────────────────────────────────
  pickRandomFood(): void {
    const pool = this.getFilteredByCategory();
    if (pool.length === 0) return;
    const random = pool[Math.floor(Math.random() * pool.length)];
    this.setSelectedFoodName(random);
    this.foodInputCtrl.setValue(random);
  }

  // ── Selection ──────────────────────────────────────────────
  getSelectedFoodName(food?: Food): string {
    return food ? food.name : '';
  }

  setSelectedFoodName(food: Food): void {
    this.selectedFood = food;
    this.showDetails = false;
    this.foodInputCtrl.setValue(food);
  }

  clearSelection(): void {
    this.selectedFood = null;
    this.showDetails = false;
    this.foodInputCtrl.setValue('');
    if (this.foodSearchInput) {
      setTimeout(() => this.foodSearchInput.nativeElement.focus());
    }
  }

  // ── Health tip for selected food ───────────────────────────
  get healthTip(): string {
    if (!this.selectedFood) return this.defaultHealthTip;
    return this.categoryHealthTips[this.selectedFood.category] || this.defaultHealthTip;
  }

  // ── Emoji for a food's category ────────────────────────────
  getFoodEmoji(food: Food): string {
    return this.categoryEmoji[food.category] || '📦';
  }

  // ── Fact strip ─────────────────────────────────────────────
  nextFact(): void {
    this.currentFactIndex = (this.currentFactIndex + 1) % this.phFacts.length;
    this.factExpanded = false;
    this.restartFactTimer();
  }

  prevFact(): void {
    this.currentFactIndex =
      (this.currentFactIndex - 1 + this.phFacts.length) % this.phFacts.length;
    this.factExpanded = false;
    this.restartFactTimer();
  }

  private startFactRotation(): void {
    this.factTimer = setInterval(() => {
      this.currentFactIndex = (this.currentFactIndex + 1) % this.phFacts.length;
      this.factExpanded = false;
    }, 6000);
  }

  private stopFactRotation(): void {
    if (this.factTimer) clearInterval(this.factTimer);
  }

  private restartFactTimer(): void {
    this.stopFactRotation();
    this.startFactRotation();
  }
}
