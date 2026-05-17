import { NextRequest, NextResponse } from 'next/server';

type OpenFoodFactsProduct = {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  image_url?: string;
  serving_quantity?: string | number;
  serving_quantity_unit?: string;
  nutriments?: Record<string, number | string | undefined>;
};

function numberValue(value: unknown): number {
  const n = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pickNutrient(nutriments: Record<string, unknown>, base: '100g' | 'serving', keys: string[]) {
  for (const key of keys) {
    const value = numberValue(nutriments[`${key}_${base}`]);
    if (value > 0) return value;
  }

  return 0;
}

function pickCalories(nutriments: Record<string, unknown>, base: '100g' | 'serving') {
  const kcal = pickNutrient(nutriments, base, ['energy-kcal', 'energy-kcal_value']);
  if (kcal > 0) return kcal;

  const kj = pickNutrient(nutriments, base, ['energy-kj', 'energy']);
  return kj > 0 ? Math.round((kj / 4.184) * 10) / 10 : 0;
}

function normalizeUnit(unit?: string): 'g' | 'ml' {
  return unit?.toLowerCase().includes('ml') ? 'ml' : 'g';
}

export async function GET(_req: NextRequest, { params }: { params: { barcode: string } }) {
  const barcode = params.barcode.replace(/\D/g, '');

  if (!barcode) {
    return NextResponse.json({ error: 'Barcode is required' }, { status: 400 });
  }

  const fields = [
    'product_name',
    'product_name_en',
    'brands',
    'image_url',
    'serving_quantity',
    'serving_quantity_unit',
    'nutriments',
  ].join(',');

  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${fields}`,
    {
      headers: {
        'User-Agent': 'CalorieTracker/1.0 (https://calorie-tracker-nu-smoky.vercel.app)',
      },
      next: { revalidate: 60 * 60 * 24 },
    },
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'Barcode lookup failed' }, { status: 502 });
  }

  const data = await res.json();
  const product = data.product as OpenFoodFactsProduct | undefined;

  if (data.status !== 1 || !product) {
    return NextResponse.json({ error: 'Product not found for this barcode' }, { status: 404 });
  }

  const nutriments = product.nutriments ?? {};
  const servingQuantity = numberValue(product.serving_quantity);
  const servingUnit = normalizeUnit(product.serving_quantity_unit);
  const hasServingData = servingQuantity > 0 && (
    numberValue(nutriments['energy-kcal_serving']) > 0 ||
    numberValue(nutriments.proteins_serving) > 0 ||
    numberValue(nutriments.carbohydrates_serving) > 0 ||
    numberValue(nutriments.fat_serving) > 0
  );
  const base = hasServingData ? 'serving' : '100g';
  const servingBase = hasServingData ? servingQuantity : 100;

  const sodiumGrams =
    pickNutrient(nutriments, base, ['sodium']) ||
    pickNutrient(nutriments, base, ['salt']) * 0.4;

  return NextResponse.json({
    barcode,
    name: product.product_name || product.product_name_en || product.brands || `Barcode ${barcode}`,
    imageUrl: product.image_url ?? null,
    servingBase,
    servingUnit,
    calories: pickCalories(nutriments, base),
    protein: pickNutrient(nutriments, base, ['proteins', 'protein']),
    carbs: pickNutrient(nutriments, base, ['carbohydrates']),
    fat: pickNutrient(nutriments, base, ['fat']),
    fiber: pickNutrient(nutriments, base, ['fiber', 'fibre']),
    sugar: pickNutrient(nutriments, base, ['sugars']),
    sodium: Math.round(sodiumGrams * 100000) / 100,
  });
}
