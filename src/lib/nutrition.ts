import type { Product } from '@prisma/client';

export type NutrientTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
};

export const EMPTY_TOTALS: NutrientTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
};

export const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACKS: 'Snacks',
};

/**
 * Calculate nutrients for a consumed quantity based on the product's serving base.
 * Example: peanut butter at 100g serving, consume 32g → factor = 0.32 applied to all nutrients.
 */
export function calculateNutrients(
  product: Pick<
    Product,
    'servingBase' | 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium'
  >,
  quantityInGrams: number,
) {
  const factor = quantityInGrams / product.servingBase;
  return {
    quantityInGrams,
    calculatedCalories: round(product.calories * factor),
    calculatedProtein: round(product.protein * factor),
    calculatedCarbs: round(product.carbs * factor),
    calculatedFat: round(product.fat * factor),
    calculatedFiber: round(product.fiber * factor),
    calculatedSugar: round(product.sugar * factor),
    calculatedSodium: round(product.sodium * factor),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function sumMealEntries(
  entries: Array<{
    calculatedCalories: number;
    calculatedProtein: number;
    calculatedCarbs: number;
    calculatedFat: number;
    calculatedFiber: number;
    calculatedSugar: number;
    calculatedSodium: number;
  }>,
): NutrientTotals {
  return entries.reduce<NutrientTotals>(
    (acc, e) => ({
      calories: acc.calories + e.calculatedCalories,
      protein: acc.protein + e.calculatedProtein,
      carbs: acc.carbs + e.calculatedCarbs,
      fat: acc.fat + e.calculatedFat,
      fiber: acc.fiber + e.calculatedFiber,
      sugar: acc.sugar + e.calculatedSugar,
      sodium: acc.sodium + e.calculatedSodium,
    }),
    { ...EMPTY_TOTALS },
  );
}
