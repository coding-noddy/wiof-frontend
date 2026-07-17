import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import * as Papa from 'papaparse';

export interface Food {
  id: string;
  name: string;
  scientificName: string;
  foodState: string;
  ph: number;
  min: number;
  max: number;
  category: string;
  confidence: number;
  verificationStatus: string;
  isApproximate: boolean;
  organization: string;
  publication: string;
  sourceUrl: string;
  lastVerified: string;
  notes: string;
}

@Injectable({
  providedIn: 'root'
})
export class FoodDataService {

  private readonly csvPath = 'assets/data/food-ph-data.csv';
  private foodsCache: Food[] | null = null;

  constructor(private http: HttpClient) {}

  getFoods(): Observable<Food[]> {

    if (this.foodsCache) {
      return of(this.foodsCache);
    }

    return this.http.get(this.csvPath, { responseType: 'text' }).pipe(

      map(csv => {

        const result = Papa.parse(csv, {
          header: true,
          skipEmptyLines: true,
          transformHeader: header => header.trim()
        });

        if (result.errors.length) {
          console.warn('CSV Parse Warnings:', result.errors);
        }

        return (result.data as any[])
          .map(row => this.mapFood(row))
          .filter(food => !!food.name);

      }),

      tap(foods => this.foodsCache = foods),

      catchError(error => {
        console.error('Unable to load food dataset.', error);
        return throwError(() => error);
      })

    );

  }

  getFoodById(id: string): Food | undefined {
    return this.foodsCache?.find(food => food.id === id);
  }

  getFoodByName(name: string): Food | undefined {
    return this.foodsCache?.find(food =>
      food.name.toLowerCase() === name.toLowerCase()
    );
  }

  searchFoods(searchText: string): Food[] {

    if (!this.foodsCache) {
      return [];
    }

    const search = searchText.trim().toLowerCase();

    return this.foodsCache.filter(food =>
      food.name.toLowerCase().includes(search) ||
      food.scientificName.toLowerCase().includes(search) ||
      food.category.toLowerCase().includes(search)
    );

  }

  getFoodsByCategory(category: string): Food[] {

    if (!this.foodsCache) {
      return [];
    }

    return this.foodsCache.filter(food =>
      food.category.toLowerCase() === category.toLowerCase()
    );

  }

  refreshCache(): void {
    this.foodsCache = null;
  }

  private mapFood(row: any): Food {

    return {
      id: row.id?.trim() ?? '',
      name: row.name?.trim() ?? '',
      scientificName: row.scientificName?.trim() ?? '',
      foodState: row.foodState?.trim() ?? '',
      ph: Number(row.ph),
      min: Number(row.min),
      max: Number(row.max),
      category: row.category?.trim() ?? '',
      confidence: Number(row.confidence),
      verificationStatus: row.verificationStatus?.trim() ?? '',
      isApproximate: String(row.isApproximate).toLowerCase() === 'true',
      organization: row.organization?.trim() ?? '',
      publication: row.publication?.trim() ?? '',
      sourceUrl: row.sourceUrl?.trim() ?? '',
      lastVerified: row.lastVerified?.trim() ?? '',
      notes: row.notes?.trim() ?? ''
    };

  }

}