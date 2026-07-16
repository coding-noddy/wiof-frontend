export interface FoodPhData {
  id: string;
  name: string;
  ph: number;
  phRange: {
    min: number;
    max: number;
  };
  category: FoodCategory;
  confidence: "High" | "Medium" | "Low";
  isApproximate: boolean;
  source: string;
  sourceUrl: string;
  lastVerified: string;
  notes?: string;
}

export enum FoodCategory {
  Fruit = "Fruit",
  Vegetable = "Vegetable",
  Dairy = "Dairy",
  Meat = "Meat",
  Seafood = "Seafood",
  Grain = "Grain",
  Legume = "Legume",
  Nut = "Nut",
  Seed = "Seed",
  Beverage = "Beverage",
  Oil = "Oil",
  Condiment = "Condiment",
  Herb = "Herb",
  Spice = "Spice",
  Dessert = "Dessert",
  FastFood = "Fast Food",
  ProcessedFood = "Processed Food"
}
